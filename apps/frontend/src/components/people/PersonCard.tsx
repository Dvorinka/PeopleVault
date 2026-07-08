import * as React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Cake, Heart, Star } from "lucide-react";
import type { components } from "@peoplevault/api-client";

import { Badge } from "@/components/ui/badge";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import {
  ageTurning,
  countdownLabel,
  daysUntilNextOccurrence,
  formatMonthDay,
} from "@/lib/date";
import { cn } from "@/lib/utils";

type Person = components["schemas"]["Person"];

interface PersonCardProps {
  person: Person;
  index?: number;
}

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function PersonCard({ person, index = 0 }: PersonCardProps): React.ReactElement {
  const birthdayDays = daysUntilNextOccurrence(person.birthday);
  const anniversaryDays = daysUntilNextOccurrence(person.anniversary);
  const turning = ageTurning(person.birthday);

  const nextMilestone =
    birthdayDays !== null && anniversaryDays !== null
      ? birthdayDays <= anniversaryDays
        ? { kind: "birthday" as const, days: birthdayDays }
        : { kind: "anniversary" as const, days: anniversaryDays }
      : birthdayDays !== null
        ? { kind: "birthday" as const, days: birthdayDays }
        : anniversaryDays !== null
          ? { kind: "anniversary" as const, days: anniversaryDays }
          : null;

  const isToday = nextMilestone?.days === 0;
  const isSoon = nextMilestone !== null && nextMilestone.days <= 7;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.35,
        delay: prefersReducedMotion ? 0 : Math.min(index * 0.04, 0.3),
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <Link
        to={`/people/${person.id}`}
        className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl"
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-xl border bg-gradient-card p-5 shadow-soft transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lift",
            isToday ? "border-primary/50" : "border-border/70"
          )}
        >
          {person.isFavorite ? (
            <Star
              className="absolute right-4 top-4 h-4 w-4 fill-warning text-warning"
              aria-label="Favorite"
            />
          ) : null}

          <div className="flex items-start gap-4">
            <PersonAvatar
              name={person.fullName}
              avatarUrl={person.avatarUrl}
              nickname={person.nickname}
              size="lg"
              className="shadow-soft"
            />
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-serif text-lg font-semibold leading-tight">
                {person.fullName}
              </h3>
              {person.nickname ? (
                <p className="truncate text-sm text-muted-foreground">
                  "{person.nickname}"
                </p>
              ) : null}
              {person.relationship ? (
                <Badge variant="warm" className="mt-1.5">
                  {person.relationship}
                </Badge>
              ) : null}
            </div>
          </div>

          {nextMilestone ? (
            <div
              className={cn(
                "mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                isToday
                  ? "bg-primary/10 text-primary"
                  : isSoon
                    ? "bg-highlight text-foreground"
                    : "bg-muted/60 text-muted-foreground"
              )}
            >
              {nextMilestone.kind === "birthday" ? (
                <Cake className="h-4 w-4 shrink-0" />
              ) : (
                <Heart className="h-4 w-4 shrink-0" />
              )}
              <span className="font-medium capitalize">
                {nextMilestone.kind === "birthday" && turning !== null
                  ? `Turns ${turning}`
                  : nextMilestone.kind}
              </span>
              <span className="ml-auto text-xs font-semibold">
                {countdownLabel(nextMilestone.days)}
              </span>
            </div>
          ) : person.birthday || person.anniversary ? (
            <p className="mt-4 text-xs text-muted-foreground">
              {person.birthday ? `Born ${formatMonthDay(person.birthday)}` : ""}
              {person.birthday && person.anniversary ? " · " : ""}
              {person.anniversary
                ? `Anniv. ${formatMonthDay(person.anniversary)}`
                : ""}
            </p>
          ) : null}

          {person.tags && person.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {person.tags.slice(0, 3).map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-[10px]">
                  {tag.name}
                </Badge>
              ))}
              {person.tags.length > 3 ? (
                <Badge variant="outline" className="text-[10px]">
                  +{person.tags.length - 3}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>
      </Link>
    </motion.div>
  );
}
