import { initializeCron } from "@/lib/cron";

let started = false;

export async function ensureStartup() {
  if (started) return;
  started = true;
  await initializeCron();
}
