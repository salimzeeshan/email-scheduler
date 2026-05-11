import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { ensureStartup } from "@/lib/startup";
import { Batch } from "@/models/Batch";

export async function GET() {
  await ensureStartup();
  await connectDb();
  const batches = await Batch.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(batches);
}
