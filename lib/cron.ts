import cron, { ScheduledTask } from "node-cron";
import { connectDb } from "@/lib/db";
import { runBatch } from "@/lib/batch";
import { Batch } from "@/models/Batch";

const jobs = new Map<string, ScheduledTask>();
let initialized = false;
let keepAliveStarted = false;

function cronExpression(date: Date) {
  return `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
}

export function registerJob(batchId: string, scheduledTime: Date, intervalSeconds = 10) {
  cancelJob(batchId);
  const task = cron.schedule(
    cronExpression(scheduledTime),
    async () => {
      cancelJob(batchId);
      await runBatch(batchId, intervalSeconds);
    },
    { scheduled: true },
  );
  jobs.set(batchId, task);
}

export function cancelJob(batchId: string) {
  const task = jobs.get(batchId);
  if (task) {
    task.stop();
    jobs.delete(batchId);
  }
}

export async function initializeCron() {
  if (initialized) return;
  initialized = true;
  await connectDb();
  const pending = await Batch.find({ status: "scheduled", scheduledTime: { $gte: new Date() } })
    .select("batchId scheduledTime")
    .lean<{ batchId: string; scheduledTime: Date }[]>();
  pending.forEach((batch) => registerJob(batch.batchId, new Date(batch.scheduledTime)));
  startKeepAlive();
}

export function startKeepAlive() {
  if (keepAliveStarted) return;
  keepAliveStarted = true;
  cron.schedule("*/10 * * * *", async () => {
    const url = process.env.NEXT_PUBLIC_APP_URL;
    if (!url) return;
    try {
      await fetch(`${url.replace(/\/$/, "")}/api/keepalive`, { cache: "no-store" });
    } catch {
      // Keep-alive should never crash the app.
    }
  });
}
