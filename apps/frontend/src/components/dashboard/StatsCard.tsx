import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  accent?: "primary" | "warm" | "success";
}

const ACCENT: Record<NonNullable<StatsCardProps["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  warm: "bg-highlight text-accent-foreground",
  success: "bg-success/15 text-success",
};

export function StatsCard({
  icon: Icon,
  label,
  value,
  accent = "primary",
}: StatsCardProps): React.ReactElement {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/70 bg-gradient-card p-5 shadow-soft">
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
          ACCENT[accent]
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="font-serif text-2xl font-semibold leading-none">{value}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
