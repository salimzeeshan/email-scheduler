import { NextResponse } from "next/server";
import { createBatch, runBatch, saveTempAttachment } from "@/lib/batch";
import { hasMeaningfulHtml, htmlToText, parseRecipients } from "@/lib/utils";

export async function POST(request: Request) {
  const form = await request.formData();
  const subject = String(form.get("subject") || "");
  const bodyHtml = String(form.get("bodyHtml") || "");
  const fromName = String(form.get("fromName") || process.env.FROM_NAME || "");
  const recipients = String(form.get("recipients") || "").split(/\r?\n/);
  const parsedRecipients = parseRecipients(recipients.join("\n"));
  const intervalSeconds = Number(form.get("intervalSeconds") || 10);
  const attachmentFile = form.get("attachment") as File | null;

  if (!subject.trim() || !hasMeaningfulHtml(bodyHtml) || parsedRecipients.valid.length === 0) {
    return NextResponse.json({ error: "Subject, content, and recipients are required" }, { status: 400 });
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
      ...attachment,
      type: "instant",
    },
    "scheduled",
  );

  runBatch(batch.batchId, intervalSeconds).catch(console.error);
  return NextResponse.json({ batchId: batch.batchId });
}
