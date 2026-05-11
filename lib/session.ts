import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions } from "@/lib/session-options";

export type SessionData = {
  isLoggedIn?: boolean;
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
