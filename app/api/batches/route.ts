import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { ensureStartup } from "@/lib/startup";
import { Batch } from "@/models/Batch";

const defaultLimit = 10;
const maxLimit = 50;

export async function GET(request: Request) {
  await ensureStartup();
  await connectDb();

  const { searchParams } = new URL(request.url);
  const page = positiveInteger(searchParams.get("page"), 1);
  const limit = Math.min(positiveInteger(searchParams.get("limit"), defaultLimit), maxLimit);
  const skip = (page - 1) * limit;
  const [batches, total, scheduled, completed, failed] = await Promise.all([
    Batch.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Batch.countDocuments(),
    Batch.countDocuments({ status: "scheduled" }),
    Batch.countDocuments({ status: "completed" }),
    Batch.countDocuments({ status: "failed" }),
  ]);

  return NextResponse.json({
    batches,
    page,
    limit,
    total,
    totalPages: Math.max(Math.ceil(total / limit), 1),
    summary: { total, scheduled, completed, failed },
  });
}

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
}
