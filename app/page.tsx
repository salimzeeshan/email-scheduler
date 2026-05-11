"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, XCircle } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

type Log = { email: string; status: string; timestamp?: string; error?: string };
type Batch = {
  batchId: string;
  subject: string;
  fromName?: string;
  bodyHtml: string;
  bodyText?: string;
  attachmentName?: string;
  status: string;
  type: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  scheduledTime?: string;
  completedAt?: string;
  parentBatchId?: string;
  createdAt: string;
  recipients?: string[];
  logs: Log[];
};

export default function DashboardPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selected, setSelected] = useState<Batch | null>(null);

  async function load() {
    setBatches(await fetch("/api/batches").then((res) => res.json()));
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  const summary = useMemo(
    () => ({
      total: batches.length,
      scheduled: batches.filter((b) => b.status === "scheduled").length,
      completed: batches.filter((b) => b.status === "completed").length,
      failed: batches.filter((b) => b.status === "failed").length,
    }),
    [batches],
  );

  async function cancel(batchId: string) {
    await fetch(`/api/batches/${batchId}`, { method: "DELETE" });
    setSelected((current) => (current?.batchId === batchId ? { ...current, status: "cancelled" } : current));
    await load();
  }

  async function retry(batchId: string) {
    await fetch(`/api/batches/${batchId}/retry`, { method: "POST", body: JSON.stringify({ intervalSeconds: 10 }) });
    await load();
  }

  return (
    <PageShell title="Dashboard">
      <div className="grid gap-4 md:grid-cols-4">
        <Stat title="Total batches" value={summary.total} />
        <Stat title="Scheduled" value={summary.scheduled} />
        <Stat title="Completed" value={summary.completed} />
        <Stat title="Failed" value={summary.failed} />
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHeader><CardTitle>Batches</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <thead><tr><Th>Subject</Th><Th>Status</Th><Th>Recipients</Th><Th>Sent</Th><Th>Failed</Th><Th>Scheduled</Th><Th>Created</Th><Th>Actions</Th></tr></thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.batchId} className="cursor-pointer border-t hover:bg-muted/60" onClick={() => setSelected(batch)}>
                  <Td className="max-w-80 truncate">{batch.subject}</Td>
                  <Td><Badge variant={batch.type === "retry" ? "retry" : batch.status}>{batch.type === "retry" ? "retry" : batch.status}</Badge></Td>
                  <Td>{batch.recipientCount}</Td>
                  <Td>{batch.sentCount}</Td>
                  <Td>{batch.failedCount}</Td>
                  <Td>{formatDateTime(batch.scheduledTime)}</Td>
                  <Td>{formatDateTime(batch.createdAt)}</Td>
                  <Td onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {batch.status === "scheduled" ? <Button size="icon" variant="ghost" onClick={() => cancel(batch.batchId)}><XCircle className="h-4 w-4" /></Button> : null}
                      {batch.failedCount > 0 ? <Button size="icon" variant="ghost" onClick={() => retry(batch.batchId)}><RefreshCw className="h-4 w-4" /></Button> : null}
                      <Link
                        className="inline-flex h-8 items-center rounded-md border bg-background px-2.5 text-xs font-medium hover:bg-muted"
                        href={`/compose?duplicate=${batch.batchId}`}
                      >
                        Duplicate
                      </Link>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {selected ? (
        <div className="fixed inset-0 z-20 bg-black/20" onClick={() => setSelected(null)}>
          <aside className="ml-auto h-full w-full max-w-xl overflow-y-auto bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-semibold">{selected.subject}</h2>
                <p className="text-sm text-muted-foreground">{selected.batchId}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {selected.status === "scheduled" ? (
                  <Button variant="destructive" onClick={() => cancel(selected.batchId)}>Cancel</Button>
                ) : null}
                <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </div>
            <div className="grid gap-3 rounded-md border bg-muted/20 p-4 text-sm sm:grid-cols-2">
              <Detail label="Status" value={<Badge variant={selected.type === "retry" ? "retry" : selected.status}>{selected.type === "retry" ? "retry" : selected.status}</Badge>} />
              <Detail label="Type" value={selected.type} />
              <Detail label="From name" value={selected.fromName || "-"} />
              <Detail label="Attachment" value={selected.attachmentName || "-"} />
              <Detail label="Recipients" value={selected.recipientCount} />
              <Detail label="Scheduled" value={formatDateTime(selected.scheduledTime)} />
              <Detail label="Created" value={formatDateTime(selected.createdAt)} />
              <Detail label="Completed" value={formatDateTime(selected.completedAt)} />
              {selected.parentBatchId ? <Detail label="Parent batch" value={selected.parentBatchId} /> : null}
            </div>

            <section className="mt-5">
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Email content</h3>
              <div className="rounded-md border bg-background p-4">
                <div className="mb-3 border-b pb-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Subject</p>
                  <p className="mt-1 font-medium">{selected.subject}</p>
                </div>
                {selected.bodyHtml ? (
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selected.bodyHtml }} />
                ) : (
                  <p className="whitespace-pre-wrap text-sm">{selected.bodyText || "No content saved for this batch."}</p>
                )}
              </div>
            </section>

            <section className="mt-5">
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Recipients</h3>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <thead><tr><Th>Email</Th><Th>Status</Th><Th>Time</Th><Th>Error</Th></tr></thead>
                  <tbody>
                    {recipientRows(selected).map((row, index) => (
                      <tr key={`${row.email}-${index}`} className="border-t">
                        <Td>{row.email}</Td>
                        <Td>{row.status}</Td>
                        <Td>{formatDateTime(row.timestamp)}</Td>
                        <Td>{row.error || ""}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </section>
          </aside>
        </div>
      ) : null}
    </PageShell>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">{title}</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{value}</p></CardContent></Card>;
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <div className="mt-1 break-words">{value}</div>
    </div>
  );
}

function recipientRows(batch: Batch): Log[] {
  const logsByEmail = new Map(batch.logs.map((log) => [log.email, log]));
  const recipients = batch.recipients?.length ? batch.recipients : batch.logs.map((log) => log.email);

  return recipients.map((email) => {
    const log = logsByEmail.get(email);
    return log || { email, status: batch.status === "scheduled" ? "scheduled" : "pending" };
  });
}
