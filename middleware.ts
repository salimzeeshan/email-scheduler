import { NextRequest, NextResponse } from "next/server";
import { unsealData } from "iron-session";
import { sessionOptions } from "@/lib/session-options";
import type { SessionData } from "@/lib/session";

const publicPaths = ["/login", "/api/auth/login", "/api/setup/gmail", "/api/keepalive"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(sessionOptions.cookieName)?.value;
  if (!cookie) return redirectToLogin(request);

  try {
    const data = await unsealData<SessionData>(cookie, {
      password: sessionOptions.password,
    });
    if (data.isLoggedIn) return NextResponse.next();
  } catch {
    return redirectToLogin(request);
  }

  return redirectToLogin(request);
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
