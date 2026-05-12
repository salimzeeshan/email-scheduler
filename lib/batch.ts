import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { connectDb } from "@/lib/db";
import { sendBatchSummaryEmail, sendEmail } from "@/lib/gmail";
import { greetingName, htmlToText, normalizeEmail, parseRecipients, renderPersonalizedBody } from "@/lib/utils";
import { Batch } from "@/models/Batch";
import { Blocklist } from "@/models/Blocklist";

export type BatchPayload = {
  subject: string;
  fromName?: string;
  bodyHtml: string;
  bodyText?: string;
  recipients: string[];
  intervalSeconds?: number;
  attachmentName?: string;
  attachmentPath?: string;
  attachmentContent?: Buffer;
  scheduledTime?: Date;
  parentBatchId?: string;
  type?: "instant" | "scheduled" | "retry";
};

export async function saveTempAttachment(file: File | null) {
  if (!file || file.size === 0) return {};
  const ext = path.extname(file.name).toLowerCase();
  if (![".pdf", ".docx"].includes(ext)) throw new Error("Only PDF and DOCX attachments are allowed");
  const dir = path.join(os.tmpdir(), "email-scheduler");
  await fs.mkdir(dir, { recursive: true });
  const attachmentPath = path.join(dir, `${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`);
  const attachmentContent = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(attachmentPath, attachmentContent);
  return { attachmentName: file.name, attachmentPath, attachmentContent };
}

export async function filterRecipients(rawRecipients: string[]) {
  await connectDb();
  const parsed = parseRecipients(rawRecipients.join("\n"));
  const blocklist = await Blocklist.find({ email: { $in: parsed.valid } }).lean<{ email: string }[]>();
  const blocked = new Set(blocklist.map((entry) => entry.email));
  return {
    recipients: parsed.valid.filter((email) => !blocked.has(email)),
    skipped: parsed.valid.filter((email) => blocked.has(email)),
    invalid: parsed.invalid,
  };
}

export async function createBatch(payload: BatchPayload, status: "scheduled" | "sending" = "sending") {
  await connectDb();
  const filtered = await filterRecipients(payload.recipients);
  const batchId = `batch_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const batch = await Batch.create({
    batchId,
    subject: payload.subject,
    fromName: payload.fromName || process.env.FROM_NAME,
    bodyHtml: payload.bodyHtml,
    bodyText: payload.bodyText || htmlToText(payload.bodyHtml),
    attachmentName: payload.attachmentName,
    attachmentPath: payload.attachmentPath,
    attachmentContent: payload.attachmentContent,
    recipientCount: filtered.recipients.length,
    skippedCount: filtered.skipped.length,
    status,
    scheduledTime: payload.scheduledTime,
    parentBatchId: payload.parentBatchId,
    type: payload.type || "instant",
    recipients: filtered.recipients,
    logs: filtered.skipped.map((email) => ({
      email,
      status: "skipped",
      timestamp: new Date(),
      error: "Do-not-contact list",
    })),
  });
  return batch;
}

export async function runBatch(batchId: string, intervalSeconds = 10) {
  await connectDb();
  const batch = await Batch.findOneAndUpdate({ batchId, status: "scheduled" }, { status: "sending" }, { new: true });
  if (!batch || batch.status === "cancelled") return null;

  let sentCount = 0;
  let failedCount = 0;
  const sentEmails = new Set(
    batch.logs
      .filter((log: { email: string; status: string }) => log.status === "sent")
      .map((log: { email: string }) => normalizeEmail(log.email)),
  );

  for (const email of batch.recipients as string[]) {
    const normalizedEmail = normalizeEmail(email);
    if (sentEmails.has(normalizedEmail)) continue;

    if ((await Batch.findOne({ batchId }).select("status").lean<{ status: string }>())?.status === "cancelled") break;
    try {
      await sendEmail({
        to: email,
        subject: batch.subject,
        fromName: batch.fromName,
        bodyHtml: renderPersonalizedBody(batch.bodyHtml, email),
        bodyText: `Hey ${greetingName(email)},\n\n${batch.bodyText}`,
        attachment: batch.attachmentName
          ? {
              name: batch.attachmentName,
              content: batch.attachmentContent,
              path: batch.attachmentPath,
            }
          : null,
      });
      sentCount += 1;
      sentEmails.add(normalizedEmail);
      batch.logs.push({ email, status: "sent", timestamp: new Date() });
    } catch (error) {
      failedCount += 1;
      batch.logs.push({
        email,
        status: "failed",
        timestamp: new Date(),
        error: error instanceof Error ? error.message : "Unknown send error",
      });
    }

    batch.sentCount = sentCount;
    batch.failedCount = failedCount;
    await batch.save();

    if (intervalSeconds > 0) {
      await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));
    }
  }

  batch.sentCount = sentCount;
  batch.failedCount = failedCount;
  batch.status = failedCount > 0 && sentCount === 0 ? "failed" : "completed";
  batch.completedAt = new Date();
  batch.attachmentContent = undefined;
  await batch.save();

  await sendBatchSummaryEmail({ to: process.env.LOG_EMAIL, batch: batch.toObject() });
  return batch;
}
