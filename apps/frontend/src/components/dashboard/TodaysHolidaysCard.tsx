import * as React from "react";
import { PartyPopper } from "lucide-react";
import type { components } from "@peoplevault/api-client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api, apiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { HOLIDAY_TYPE_LABEL, countryFlag, countryName, type HolidayType } from "@/lib/constants";
import { formatLongDate, todayISO } from "@/lib/date";

type Holiday = components["schemas"]["Holiday"];

export interface TodaysHolidaysCardProps {
  country: string;
}

/**
 * Card showing today's public holidays for a given country.
 * Renders nothing if there are no holidays today (so the dashboard
 * stays uncluttered on ordinary days).
 */
export function TodaysHolidaysCard({
  country,
}: TodaysHolidaysCardProps): React.ReactElement | null {
  const { toast } = useToast();
  const [holidays, setHolidays] = React.useState<Holiday[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [errored, setErrored] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    if (!country) {
      setHolidays([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrored(false);
    (async () => {
      try {
        const { data, error } = await api.GET("/holidays/{country}", {
          params: { path: { country } },
        });
        if (!active) return;
        if (error) throw new Error(apiError(error));
        const today = todayISO();
        const todays = ((data as Holiday[] | undefined) ?? []).filter(
          (h) => h.date === today
        );
        setHolidays(todays);
      } catch (err) {
        if (!active) return;
        setErrored(true);
        // Non-fatal: dashboard shouldn't break if the holiday API is down.
        toast({
          variant: "destructive",
          title: "Couldn't load today's holidays",
          description: apiError(err),
        });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [country, toast]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-semibold">
          <PartyPopper className="h-5 w-5 text-primary" />
          Today's holidays
        </h2>
        <Skeleton className="h-16 w-full rounded-xl" />
      </section>
    );
  }

  if (errored || holidays.length === 0) return null;

  return (
    <section className="rounded-2xl border border-highlight/60 bg-gradient-warm p-5 shadow-soft sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
          <PartyPopper className="h-5 w-5 text-primary" />
          Today's holidays
        </h2>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden="true" className="text-base leading-none">
            {countryFlag(country)}
          </span>
          {countryName(country)}
        </span>
      </div>
      <ul className="space-y-2.5">
        {holidays.map((h) => {
          const type = h.type as HolidayType | undefined;
          return (
            <li
              key={`${h.date}-${h.name}`}
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/70 p-3 shadow-soft"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-highlight">
                <PartyPopper className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{h.name}</p>
                <p className="text-xs text-muted-foreground">{formatLongDate(h.date)}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                {type ? (
                  <Badge variant="outline" className="text-[10px]">
                    {HOLIDAY_TYPE_LABEL[type] ?? type}
                  </Badge>
                ) : null}
                {h.global ? (
                  <Badge variant="success" className="text-[10px]">National</Badge>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
