import { NextResponse } from "next/server";
import { createBatch, runBatch } from "@/lib/batch";
import { connectDb } from "@/lib/db";
import { Batch } from "@/models/Batch";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  await connectDb();
  const { id } = await params;
  const source = await Batch.findOne({ batchId: id });
  if (!source) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  const failedRecipients = source.logs.filter((log: { status: string }) => log.status === "failed").map((log: { email: string }) => log.email);
  if (failedRecipients.length === 0) {
    return NextResponse.json({ error: "No failed recipients to retry" }, { status: 400 });
  }
  const { intervalSeconds = 10 } = await request.json().catch(() => ({}));
  const batch = await createBatch(
    {
      subject: source.subject,
      fromName: source.fromName,
      bodyHtml: source.bodyHtml,
      bodyText: source.bodyText,
      attachmentName: source.attachmentName,
      attachmentPath: source.attachmentPath,
      recipients: failedRecipients,
      parentBatchId: source.batchId,
      type: "retry",
    },
    "scheduled",
  );
  runBatch(batch.batchId, Number(intervalSeconds)).catch(console.error);
  return NextResponse.json({ batchId: batch.batchId });
}
