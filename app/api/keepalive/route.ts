import { NextResponse } from "next/server";
import { ensureStartup } from "@/lib/startup";

export async function GET() {
  await ensureStartup();
  return NextResponse.json({ ok: true });
}
