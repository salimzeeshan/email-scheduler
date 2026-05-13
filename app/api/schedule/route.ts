import { NextResponse } from "next/server";
import { createBatch, saveTempAttachment } from "@/lib/batch";
import { registerJob } from "@/lib/cron";
import { hasMeaningfulHtml, htmlToText, parseRecipients, parseScheduleDate } from "@/lib/utils";

export async function POST(request: Request) {
  const form = await request.formData();
  const subject = String(form.get("subject") || "");
  const bodyHtml = String(form.get("bodyHtml") || "");
  const fromName = String(form.get("fromName") || process.env.FROM_NAME || "");
  const recipients = String(form.get("recipients") || "").split(/\r?\n/);
  const parsedRecipients = parseRecipients(recipients.join("\n"));
  const intervalSeconds = Number(form.get("intervalSeconds") || 10);
  const scheduled = parseScheduleDate(String(form.get("scheduledTime") || ""));
  const attachmentFile = form.get("attachment") as File | null;

  if (!subject.trim() || !hasMeaningfulHtml(bodyHtml) || parsedRecipients.valid.length === 0) {
    return NextResponse.json({ error: "Subject, content, and recipients are required" }, { status: 400 });
  }

  if (!scheduled || scheduled <= new Date()) {
    return NextResponse.json({ error: "A future scheduled time is required" }, { status: 400 });
  }

  const attachment = await saveTempAttachment(attachmentFile);
  const batch = await createBatch(
    {
      subject,
      fromName,
      bodyHtml,
      bodyText: htmlToText(bodyHtml),
      recipients: parsedRecipients.valid,
      intervalSeconds,
      scheduledTime: scheduled,
      type: "scheduled",
      ...attachment,
    },
    "scheduled",
  );
  registerJob(batch.batchId, scheduled, intervalSeconds);
  return NextResponse.json({ batchId: batch.batchId });
}
