import { initializeCron } from "@/lib/cron";

let started = false;
let startupPromise: Promise<void> | null = null;

export async function ensureStartup() {
  if (started) return;
  if (!startupPromise) {
    startupPromise = initializeCron()
      .then(() => {
        started = true;
      })
      .finally(() => {
        startupPromise = null;
      });
  }
  await startupPromise;
}
