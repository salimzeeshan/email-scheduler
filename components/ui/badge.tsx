import * as React from "react";
import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  scheduled: "bg-sky-100 text-sky-800 border-sky-200",
  sending: "bg-amber-100 text-amber-800 border-amber-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  failed: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-zinc-100 text-zinc-700 border-zinc-200",
  retry: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
};

export function Badge({ className, children, variant }: React.HTMLAttributes<HTMLSpanElement> & { variant?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
        variant ? variants[variant] : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
