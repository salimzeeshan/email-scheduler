"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, Td, Th } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

type Entry = { _id: string; email: string; addedAt: string };

export default function BlocklistPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [email, setEmail] = useState("");

  async function load() {
    setEntries(await fetch("/api/blocklist").then((res) => res.json()));
  }

  useEffect(() => { load(); }, []);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    await fetch("/api/blocklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    setEmail("");
    await load();
  }

  async function remove(id: string) {
    await fetch("/api/blocklist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }

  return (
    <PageShell title="Do Not Contact">
      <Card className="mb-6">
        <CardHeader><CardTitle>Add address</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="flex max-w-xl gap-2">
            <div className="flex-1 space-y-2"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <Button className="mt-7">Add</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Blocked addresses</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <thead><tr><Th>Email</Th><Th>Added</Th><Th>Actions</Th></tr></thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry._id} className="border-t">
                  <Td>{entry.email}</Td><Td>{formatDateTime(entry.addedAt)}</Td>
                  <Td><Button size="icon" variant="ghost" onClick={() => remove(entry._id)}><Trash2 className="h-4 w-4" /></Button></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
