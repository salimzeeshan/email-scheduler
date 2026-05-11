"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, LinkIcon, List, ListOrdered, Underline as UnderlineIcon } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { greetingName, parseRecipients, renderPersonalizedBody } from "@/lib/utils";

type Template = { _id: string; name: string; subject: string; fromName?: string; bodyHtml: string };
type Batch = { subject: string; fromName?: string; bodyHtml: string; recipients?: string[] };

export default function ComposePage() {
  return (
    <Suspense fallback={null}>
      <ComposeContent />
    </Suspense>
  );
}

function ComposeContent() {
  const search = useSearchParams();
  const [templateName, setTemplateName] = useState("");
  const [subject, setSubject] = useState("");
  const [fromName, setFromName] = useState("");
  const [recipientsText, setRecipientsText] = useState("");
  const [intervalSeconds, setIntervalSeconds] = useState(10);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledClock, setScheduledClock] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [excluded, setExcluded] = useState(0);
  const [message, setMessage] = useState("");

  const editor = useEditor({
    extensions: [StarterKit, Underline, Link.configure({ openOnClick: false })],
    content: "<p></p>",
    immediatelyRender: false,
  });

  const parsed = useMemo(() => parseRecipients(recipientsText), [recipientsText]);
  const firstRecipient = parsed.valid[0] || "alex@example.com";
  const previewHtml = renderPersonalizedBody(editor?.getHTML() || "", firstRecipient);
  const hasContent = (editor?.getText() || "").trim().length > 0;

  useEffect(() => {
    async function loadDraft() {
      const templateId = search?.get("template");
      const duplicateId = search?.get("duplicate");
      if (templateId) {
        const templates: Template[] = await fetch("/api/templates").then((r) => r.json());
        const template = templates.find((item) => item._id === templateId);
        if (template) {
          setTemplateName("");
          setSubject(template.subject);
          setFromName(template.fromName || "");
          editor?.commands.setContent(template.bodyHtml);
        }
      }
      if (duplicateId) {
        const batch: Batch = await fetch(`/api/batches/${duplicateId}`).then((r) => r.json());
        setTemplateName("");
        setSubject(batch.subject);
        setFromName(batch.fromName || "");
        setRecipientsText((batch.recipients || []).join("\n"));
        editor?.commands.setContent(batch.bodyHtml);
      }
    }
    if (editor) loadDraft();
  }, [editor, search]);

  useEffect(() => {
    async function checkBlocklist() {
      const list: Array<{ email: string }> = await fetch("/api/blocklist").then((r) => r.json()).catch(() => []);
      const blocked = new Set(list.map((entry) => entry.email));
      setExcluded(parsed.valid.filter((email) => blocked.has(email)).length);
    }
    checkBlocklist();
  }, [parsed.valid]);

  function appendForm(extra?: Record<string, string>) {
    const form = new FormData();
    form.set("subject", subject);
    form.set("fromName", fromName);
    form.set("bodyHtml", editor?.getHTML() || "");
    form.set("recipients", parsed.valid.join("\n"));
    form.set("intervalSeconds", String(intervalSeconds));
    if (attachment) form.set("attachment", attachment);
    Object.entries(extra || {}).forEach(([key, value]) => form.set(key, value));
    return form;
  }

  async function action(url: string, extra?: Record<string, string>) {
    const missing = [
      !subject.trim() ? "subject line" : "",
      !hasContent ? "content" : "",
      !attachment ? "attachment" : "",
      url === "/api/schedule" && !scheduledDate ? "schedule date" : "",
      url === "/api/schedule" && !scheduledClock ? "schedule time" : "",
    ].filter(Boolean);

    if (missing.length > 0) {
      setMessage(`${formatMissingFields(missing)} ${missing.length === 1 ? "is" : "are"} required.`);
      return;
    }
    setMessage("Working...");
    const res = await fetch(url, { method: "POST", body: appendForm(extra) });
    const json = await res.json().catch(() => ({}));
    setMessage(res.ok ? `Done. ${json.batchId ? `Batch ${json.batchId}` : ""}` : json.error || "Request failed");
  }

  async function saveTemplate() {
    if (!templateName) {
      setMessage("Add a template name first.");
      return;
    }
    if (!subject.trim() || !hasContent) {
      setMessage("Subject line and content are required to save a template.");
      return;
    }
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: templateName, subject, fromName, bodyHtml: editor?.getHTML() || "" }),
    });
    setMessage("Template saved.");
  }

  function setLink() {
    const href = window.prompt("URL");
    if (href) editor?.chain().focus().setLink({ href }).run();
  }

  return (
    <PageShell title="Compose">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Message</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Template name"><Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} /></Field>
                <Field label="Subject line *"><Input required value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
                <Field label="From name"><Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="FROM_NAME" /></Field>
                <Field label="Greeting prefix">
                  <Input value="Hey," readOnly />
                  <p className="mt-1 text-xs text-muted-foreground">First greeting: Hey {greetingName(firstRecipient)},</p>
                </Field>
              </div>
              <div className="rounded-md border bg-white">
                <div className="flex flex-wrap gap-1 border-b p-2">
                  <Button type="button" size="icon" variant="ghost" onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => editor?.chain().focus().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="ghost" onClick={setLink}><LinkIcon className="h-4 w-4" /></Button>
                </div>
                <EditorContent editor={editor} className="p-4" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Recipients and delivery</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Recipient list">
                <Textarea value={recipientsText} onChange={(e) => setRecipientsText(e.target.value)} placeholder="one email per line" />
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{parsed.valid.length} valid</span><span>{parsed.invalid.length} invalid</span><span>{excluded} excluded by blocklist</span>
                </div>
              </Field>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label=".txt upload"><Input type="file" accept=".txt" onChange={async (e) => setRecipientsText(`${recipientsText}\n${await e.target.files?.[0]?.text()}`)} /></Field>
                <Field label="Attachment *"><Input required type="file" accept=".pdf,.docx" onChange={(e) => setAttachment(e.target.files?.[0] || null)} /></Field>
                <Field label="Send interval"><Input type="number" min={0} value={intervalSeconds} onChange={(e) => setIntervalSeconds(Number(e.target.value))} /></Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Schedule date"><Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} /></Field>
                <Field label="Schedule time"><Input type="time" value={scheduledClock} onChange={(e) => setScheduledClock(e.target.value)} /></Field>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={saveTemplate}>Save template</Button>
                <Button type="button" variant="outline" onClick={() => action("/api/test-email")}>Send test email</Button>
                <Button type="button" onClick={() => action("/api/send")}>Send now</Button>
                <Button type="button" variant="outline" onClick={() => action("/api/schedule", { scheduledTime: formatScheduleDateTime(scheduledDate, scheduledClock) })}>Schedule</Button>
              </div>
              {!hasContent ? <p className="text-xs text-muted-foreground">Email content is required.</p> : null}
              {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader><CardTitle>Live preview</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border bg-white p-4">
              <p className="mb-3 text-sm font-semibold">{subject || "Subject line"}</p>
              <div className="preview-body text-sm" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function formatMissingFields(fields: string[]) {
  if (fields.length === 1) return fields[0][0].toUpperCase() + fields[0].slice(1);
  if (fields.length === 2) return `${capitalize(fields[0])} and ${fields[1]}`;
  return `${capitalize(fields.slice(0, -1).join(", "))}, and ${fields[fields.length - 1]}`;
}

function capitalize(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

function formatScheduleDateTime(date: string, time: string) {
  if (!date || !time) return "";
  const [year, month, day] = date.split("-");
  const [hourValue, minute] = time.split(":");
  const hour = Number(hourValue);
  const meridiem = hour >= 12 ? "PM" : "AM";
  const twelveHour = hour % 12 || 12;
  return `${day}/${month}/${year} ${String(twelveHour).padStart(2, "0")}:${minute} ${meridiem}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
