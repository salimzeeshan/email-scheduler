"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, LoaderCircle, RefreshCw, XCircle } from "lucide-react";
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
type Summary = { total: number; scheduled: number; completed: number; failed: number };
type BatchesResponse = {
  batches: Batch[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  summary: Summary;
};

const pageSize = 10;
const emptySummary: Summary = { total: 0, scheduled: 0, completed: 0, failed: 0 };

export default function DashboardPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selected, setSelected] = useState<Batch | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [loading, setLoading] = useState(true);

  async function load(currentPage = page) {
    setLoading(true);
    try {
      const result: BatchesResponse = await fetch(`/api/batches?page=${currentPage}&limit=${pageSize}`).then((res) => res.json());
      setBatches(result.batches);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setSummary(result.summary);
      setSelected((current) => {
        if (!current) return current;
        return result.batches.find((batch) => batch.batchId === current.batchId) || current;
      });
      if (currentPage > result.totalPages) setPage(result.totalPages);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
    const timer = setInterval(() => load(page), 5000);
    return () => clearInterval(timer);
  }, [page]);

  async function cancel(batchId: string) {
    await fetch(`/api/batches/${batchId}`, { method: "DELETE" });
    setSelected((current) => (current?.batchId === batchId ? { ...current, status: "cancelled" } : current));
    await load(page);
  }

  async function retry(batchId: string) {
    await fetch(`/api/batches/${batchId}/retry`, { method: "POST", body: JSON.stringify({ intervalSeconds: 10 }) });
    setPage(1);
    await load(1);
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
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Batches</CardTitle>
            {loading ? (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <thead><tr><Th>Subject</Th><Th>Status</Th><Th>Recipients</Th><Th>Sent</Th><Th>Failed</Th><Th>Scheduled</Th><Th>Created</Th><Th>Actions</Th></tr></thead>
            <tbody>
              {loading && batches.length === 0 ? (
                <tr className="border-t">
                  <Td colSpan={8} className="py-8 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Loading batches
                    </span>
                  </Td>
                </tr>
              ) : batches.length > 0 ? batches.map((batch) => (
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
              )) : (
                <tr className="border-t">
                  <Td colSpan={8} className="py-8 text-center text-muted-foreground">No batches yet.</Td>
                </tr>
              )}
            </tbody>
          </Table>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
            <span>{paginationRange(page, pageSize, total)}</span>
            <div className="flex items-center gap-2">
              <Button type="button" size="icon" variant="outline" disabled={loading || page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-24 text-center">Page {page} of {totalPages}</span>
              <Button type="button" size="icon" variant="outline" disabled={loading || page >= totalPages} onClick={() => setPage((current) => Math.min(current + 1, totalPages))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selected ? (
        <div className="fixed inset-0 z-20 bg-black/20" onClick={() => setSelected(null)}>
          <aside className="ml-auto h-full w-full overflow-y-auto bg-card p-6 shadow-xl lg:w-1/2" onClick={(e) => e.stopPropagation()}>
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
                        <Td className="whitespace-nowrap">{formatDateTime(row.timestamp)}</Td>
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

function paginationRange(page: number, limit: number, total: number) {
  if (total === 0) return "Showing 0 batches";
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return `Showing ${start}-${end} of ${total} batches`;
}

function recipientRows(batch: Batch): Log[] {
  const logsByEmail = new Map(batch.logs.map((log) => [log.email, log]));
  const recipients = batch.recipients?.length ? batch.recipients : batch.logs.map((log) => log.email);

  return recipients.map((email) => {
    const log = logsByEmail.get(email);
    return log || { email, status: batch.status === "scheduled" ? "scheduled" : "pending" };
  });
}
