import { NextResponse } from "next/server";
import { getAuthUrl, saveRefreshToken } from "@/lib/gmail";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(getAuthUrl());
  await saveRefreshToken(code);
  return NextResponse.redirect(new URL("/setup?connected=1", request.url));
}

export async function POST(request: Request) {
  const { code } = await request.json();
  await saveRefreshToken(code);
  return NextResponse.json({ ok: true });
}
