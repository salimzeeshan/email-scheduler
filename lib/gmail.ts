import { google } from "googleapis";
import fs from "node:fs/promises";
import path from "node:path";
import { connectDb } from "@/lib/db";
import { renderPersonalizedBody } from "@/lib/utils";
import { Setting } from "@/models/Setting";

type Attachment = {
  name: string;
  path?: string;
  content?: Buffer;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  fromName?: string;
  bodyHtml: string;
  bodyText: string;
  attachment?: Attachment | null;
};

function oauthClient() {
  const client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI,
  );
  return client;
}

export function getAuthUrl() {
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/gmail.send"],
  });
}

export async function saveRefreshToken(code: string) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) throw new Error("Google did not return a refresh token");
  await connectDb();
  await Setting.findOneAndUpdate(
    { key: "gmail_refresh_token" },
    { value: tokens.refresh_token },
    { upsert: true },
  );
  return tokens.refresh_token;
}

async function getRefreshToken() {
  if (process.env.GMAIL_REFRESH_TOKEN) return process.env.GMAIL_REFRESH_TOKEN;
  await connectDb();
  const setting = await Setting.findOne({ key: "gmail_refresh_token" }).lean<{ value: string }>();
  if (!setting?.value) throw new Error("Gmail refresh token is not configured");
  return setting.value;
}

async function gmailClient() {
  const client = oauthClient();
  client.setCredentials({ refresh_token: await getRefreshToken() });
  return google.gmail({ version: "v1", auth: client });
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value).toString("base64")}?=`;
}

function base64Url(input: string) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function loadAttachment(attachment?: Attachment | null) {
  if (!attachment) return null;
  const content = attachment.content || (attachment.path ? await fs.readFile(attachment.path) : null);
  if (!content) return null;
  return {
    filename: attachment.name,
    contentType:
      path.extname(attachment.name).toLowerCase() === ".pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    content,
  };
}

async function buildRawEmail(input: SendEmailInput) {
  const boundary = `mixed_${Date.now()}`;
  const altBoundary = `alt_${Date.now()}`;
  const fromName = input.fromName || process.env.FROM_NAME || "Me";
  const from = process.env.LOG_EMAIL || process.env.TEST_EMAIL || "me";
  const attachment = await loadAttachment(input.attachment);

  const lines = [
    `To: ${input.to}`,
    `From: ${encodeHeader(fromName)} <${from}>`,
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    "",
    `--${altBoundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    input.bodyText,
    "",
    `--${altBoundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    input.bodyHtml,
    "",
    `--${altBoundary}--`,
  ];

  if (attachment) {
    lines.push(
      `--${boundary}`,
      `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      "",
      attachment.content.toString("base64"),
    );
  }

  lines.push(`--${boundary}--`);
  return base64Url(lines.join("\r\n"));
}

export async function sendEmail(input: SendEmailInput) {
  const gmail = await gmailClient();
  const raw = await buildRawEmail(input);
  return gmail.users.messages.send({ userId: "me", requestBody: { raw } });
}

export async function sendPersonalizedEmail(input: Omit<SendEmailInput, "bodyHtml"> & { bodyHtml: string }) {
  const bodyHtml = renderPersonalizedBody(input.bodyHtml, input.to);
  const bodyText = `Hey ${input.to.split("@")[0]},\n\n${input.bodyText}`;
  return sendEmail({ ...input, bodyHtml, bodyText });
}

export async function sendBatchSummaryEmail({
  to,
  batch,
}: {
  to?: string;
  batch: {
    batchId: string;
    subject: string;
    bodyHtml: string;
    attachmentName?: string;
    recipientCount: number;
    sentCount: number;
    failedCount: number;
    skippedCount: number;
    scheduledTime?: Date;
    logs: Array<{ email: string; status: string; timestamp?: Date; error?: string }>;
  };
}) {
  if (!to) return;
  const rows = batch.logs
    .map(
      (log) =>
        `<tr><td>${log.email}</td><td>${log.status}</td><td>${log.timestamp ? new Date(log.timestamp).toLocaleString() : ""}</td><td>${log.error || ""}</td></tr>`,
    )
    .join("");
  const html = `
    <h2>Batch ${batch.batchId} finished</h2>
    <p><strong>Subject:</strong> ${batch.subject}</p>
    <p><strong>Total:</strong> ${batch.recipientCount} | <strong>Sent:</strong> ${batch.sentCount} | <strong>Failed:</strong> ${batch.failedCount} | <strong>Skipped:</strong> ${batch.skippedCount}</p>
    ${batch.scheduledTime ? `<p><strong>Scheduled:</strong> ${new Date(batch.scheduledTime).toLocaleString()}</p>` : ""}
    <p><strong>Attachment:</strong> ${batch.attachmentName || "None"}</p>
    <h3>Email body</h3>${batch.bodyHtml}
    <h3>Recipient log</h3>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:13px">
      <thead><tr><th>Email</th><th>Status</th><th>Timestamp</th><th>Error</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  await sendEmail({
    to,
    subject: `Batch summary: ${batch.subject}`,
    fromName: process.env.FROM_NAME,
    bodyHtml: html,
    bodyText: `Batch ${batch.batchId} finished. Sent ${batch.sentCount}, failed ${batch.failedCount}, skipped ${batch.skippedCount}.`,
  });
}
