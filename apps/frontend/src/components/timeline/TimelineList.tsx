import * as React from "react";
import {
  Cake,
  Gift,
  Heart,
  GraduationCap,
  Camera,
  Sparkles,
  StickyNote,
  Bell,
  Palmtree,
  Handshake,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { components } from "@peoplevault/api-client";

import { formatLongDate, relativeTime } from "@/lib/date";
import { TIMELINE_TYPE_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

type TimelineEntry = components["schemas"]["TimelineEntry"];

const TYPE_ICON: Record<string, LucideIcon> = {
  birthday: Cake,
  anniversary: Heart,
  met: Handshake,
  gift: Gift,
  vacation: Palmtree,
  achievement: GraduationCap,
  memory: Sparkles,
  photo: Camera,
  reminder: Bell,
  note: StickyNote,
};

export function TimelineEntryItem({
  entry,
  onDelete,
}: {
  entry: TimelineEntry;
  onDelete?: (id: string) => void;
}): React.ReactElement {
  const Icon = TYPE_ICON[entry.type ?? "note"] ?? StickyNote;
  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      {/* line */}
      <div className="absolute left-[18px] top-10 bottom-0 w-px bg-border" aria-hidden="true" />
      <div
        className={cn(
          "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card shadow-soft"
        )}
      >
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1 rounded-xl border border-border/70 bg-gradient-card p-4 shadow-soft">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {entry.type ? TIMELINE_TYPE_LABEL[entry.type] ?? entry.type : "Entry"}
            </p>
            {entry.title ? (
              <p className="mt-0.5 font-serif text-base font-semibold leading-tight">
                {entry.title}
              </p>
            ) : null}
          </div>
          {onDelete && entry.id ? (
            <button
              type="button"
              onClick={() => onDelete(entry.id!)}
              className="rounded-md p-1 text-xs text-muted-foreground hover:text-destructive"
              aria-label="Delete entry"
            >
              Delete
            </button>
          ) : null}
        </div>
        {entry.body ? (
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">
            {entry.body}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          {entry.occurredOn ? formatLongDate(entry.occurredOn) : relativeTime(entry.createdAt)}
        </p>
      </div>
    </div>
  );
}

export function TimelineList({
  entries,
  onDelete,
}: {
  entries: TimelineEntry[];
  onDelete?: (id: string) => void;
}): React.ReactElement {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
        No memories yet. Add a timeline entry to start building their story.
      </p>
    );
  }
  const sorted = [...entries].sort((a, b) => {
    const ad = a.occurredOn ?? a.createdAt ?? "";
    const bd = b.occurredOn ?? b.createdAt ?? "";
    return bd.localeCompare(ad);
  });
  return (
    <div className="space-y-0">
      {sorted.map((e) => (
        <TimelineEntryItem key={e.id} entry={e} onDelete={onDelete} />
      ))}
    </div>
  );
}
