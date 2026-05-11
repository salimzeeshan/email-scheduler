import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { isValidEmail, normalizeEmail } from "@/lib/utils";
import { Blocklist } from "@/models/Blocklist";

export async function GET() {
  await connectDb();
  const blocklist = await Blocklist.find().sort({ addedAt: -1 }).lean();
  return NextResponse.json(blocklist);
}

export async function POST(request: Request) {
  await connectDb();
  const { email } = await request.json();
  const normalized = normalizeEmail(email || "");
  if (!isValidEmail(normalized)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  const entry = await Blocklist.findOneAndUpdate({ email: normalized }, { email: normalized }, { upsert: true, new: true });
  return NextResponse.json(entry);
}

export async function DELETE(request: Request) {
  await connectDb();
  const { email, id } = await request.json();
  if (id) await Blocklist.findByIdAndDelete(id);
  if (email) await Blocklist.deleteOne({ email: normalizeEmail(email) });
  return NextResponse.json({ ok: true });
}
