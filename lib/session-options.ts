import type { SessionOptions } from "iron-session";

export const sessionOptions: SessionOptions = {
  cookieName: "email_scheduler_session",
  password:
    process.env.SESSION_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    "development-password-change-me-32chars",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
};
