import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SetupPage({ searchParams }: { searchParams: Promise<{ connected?: string }> }) {
  return (
    <PageShell title="Gmail Setup">
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>OAuth connection</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect Gmail once to store a refresh token in MongoDB. Future sends use that token silently.
          </p>
          <form action="/api/setup/gmail" method="GET">
            <Button>Connect Gmail</Button>
          </form>
          <SetupStatus searchParams={searchParams} />
          <p className="text-xs text-muted-foreground">
            Redirect URI must match <span className="font-mono">GMAIL_REDIRECT_URI</span>.
          </p>
          <Link className="text-sm underline" href="/compose">Go to composer</Link>
        </CardContent>
      </Card>
    </PageShell>
  );
}

async function SetupStatus({ searchParams }: { searchParams: Promise<{ connected?: string }> }) {
  const params = await searchParams;
  return params.connected ? <p className="text-sm text-emerald-700">Gmail refresh token saved.</p> : null;
}
