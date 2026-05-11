import { NextResponse } from "next/server";
import { cancelJob } from "@/lib/cron";
import { connectDb } from "@/lib/db";
import { Batch } from "@/models/Batch";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  await connectDb();
  const { id } = await params;
  const batch = await Batch.findOne({ batchId: id }).lean();
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  return NextResponse.json(batch);
}

export async function DELETE(_request: Request, { params }: Params) {
  await connectDb();
  const { id } = await params;
  const batch = await Batch.findOne({ batchId: id });
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  if (batch.status !== "scheduled") {
    return NextResponse.json({ error: "Only scheduled batches can be cancelled" }, { status: 400 });
  }
  cancelJob(id);
  batch.status = "cancelled";
  await batch.save();
  return NextResponse.json({ ok: true });
}
