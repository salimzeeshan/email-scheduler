import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Ban, Edit3, MailCheck, Settings, StickyNote } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Email Campaign Manager",
  description: "Personal Gmail campaign scheduler for job applications",
};

const nav = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/compose", label: "Compose", icon: Edit3 },
  { href: "/templates", label: "Templates", icon: StickyNote },
  { href: "/blocklist", label: "Blocklist", icon: Ban },
  { href: "/setup", label: "Setup", icon: Settings },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <aside className="hidden w-64 border-r bg-white lg:block">
            <div className="flex h-16 items-center gap-2 border-b px-5">
              <MailCheck className="h-5 w-5" />
              <span className="font-semibold">Campaign Manager</span>
            </div>
            <nav className="space-y-1 p-3">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
