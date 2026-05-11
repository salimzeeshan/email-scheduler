import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const { password } = await request.json();
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  const session = await getSession();
  session.isLoggedIn = true;
  await session.save();
  return NextResponse.json({ ok: true });
}
