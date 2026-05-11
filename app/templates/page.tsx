"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

type Template = { _id: string; name: string; subject: string; updatedAt: string };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);

  async function load() {
    setTemplates(await fetch("/api/templates").then((res) => res.json()));
  }

  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    await fetch("/api/templates", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await load();
  }

  return (
    <PageShell title="Templates">
      <Card>
        <CardHeader><CardTitle>Saved templates</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <thead><tr><Th>Name</Th><Th>Subject</Th><Th>Last updated</Th><Th>Actions</Th></tr></thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template._id} className="border-t">
                  <Td className="font-medium"><Link href={`/compose?template=${template._id}`}>{template.name}</Link></Td>
                  <Td>{template.subject}</Td>
                  <Td>{formatDateTime(template.updatedAt)}</Td>
                  <Td><Button size="icon" variant="ghost" onClick={() => remove(template._id)}><Trash2 className="h-4 w-4" /></Button></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
