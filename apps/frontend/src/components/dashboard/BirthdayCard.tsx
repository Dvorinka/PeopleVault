import * as React from "react";
import { Link } from "react-router-dom";
import { Cake } from "lucide-react";
import type { components } from "@peoplevault/api-client";

import { PersonAvatar } from "@/components/common/PersonAvatar";
import { ageTurning, countdownLabel, daysUntilNextOccurrence } from "@/lib/date";
import { cn } from "@/lib/utils";

type Person = components["schemas"]["Person"];

export function BirthdayCard({ person }: { person: Person }): React.ReactElement {
  const days = daysUntilNextOccurrence(person.birthday);
  const turning = ageTurning(person.birthday);
  const isToday = days === 0;
  const isSoon = days !== null && days <= 7;

  return (
    <Link
      to={`/people/${person.id}`}
      className="group flex items-center gap-4 rounded-xl border border-border/70 bg-gradient-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <PersonAvatar
        name={person.fullName}
        avatarUrl={person.avatarUrl}
        nickname={person.nickname}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-base font-semibold leading-tight">
          {person.fullName}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Cake className="h-3.5 w-3.5" />
          {turning !== null ? `Turning ${turning}` : "Birthday"}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
          isToday
            ? "bg-primary text-primary-foreground"
            : isSoon
              ? "bg-highlight text-foreground"
              : "bg-muted text-muted-foreground"
        )}
      >
        {countdownLabel(days)}
      </span>
    </Link>
  );
}
