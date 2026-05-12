import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/gmail";
import { hasMeaningfulHtml, htmlToText, renderPersonalizedBody } from "@/lib/utils";
import { saveTempAttachment } from "@/lib/batch";

export async function POST(request: Request) {
  const form = await request.formData();
  const to = process.env.TEST_EMAIL;
  if (!to) return NextResponse.json({ error: "TEST_EMAIL is not configured" }, { status: 400 });
  const subject = String(form.get("subject") || "");
  const bodyHtml = String(form.get("bodyHtml") || "");
  const attachmentFile = form.get("attachment") as File | null;

  if (!subject.trim() || !hasMeaningfulHtml(bodyHtml) || !attachmentFile || attachmentFile.size === 0) {
    return NextResponse.json({ error: "Subject, content, and attachment are required" }, { status: 400 });
  }

  const attachment = await saveTempAttachment(attachmentFile);

  await sendEmail({
    to,
    subject,
    fromName: String(form.get("fromName") || process.env.FROM_NAME || ""),
    bodyHtml: renderPersonalizedBody(bodyHtml, to),
    bodyText: `Hey,\n\n${htmlToText(bodyHtml)}`,
    attachment: attachment.attachmentName
      ? {
          name: attachment.attachmentName,
          content: attachment.attachmentContent,
          path: attachment.attachmentPath,
        }
      : null,
  });
  return NextResponse.json({ ok: true });
}
