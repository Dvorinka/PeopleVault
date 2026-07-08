import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Globe2, PartyPopper } from "lucide-react";
import type { components } from "@peoplevault/api-client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { CountrySelect } from "@/components/common/CountrySelect";
import { EmptyState } from "@/components/common/EmptyState";
import { api, apiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  COUNTRY_FLAG,
  HOLIDAY_TYPES,
  HOLIDAY_TYPE_LABEL,
  countryName,
  type HolidayType,
} from "@/lib/constants";
import { formatLongDate, parseDate } from "@/lib/date";
import { cn } from "@/lib/utils";

type Holiday = components["schemas"]["Holiday"];

export interface HolidayBrowserProps {
  /** Default country code (e.g. from user settings). */
  defaultCountry?: string;
  /** Show selection checkboxes + return selected holidays via callback. */
  selectable?: boolean;
  /** Called whenever the selection changes (when selectable). */
  onSelectionChange?: (selected: Holiday[]) => void;
  /** Hide the country/year controls (used when parent drives them). */
  hideControls?: boolean;
  className?: string;
}

const CURRENT_YEAR = new Date().getFullYear();

const TYPE_BADGE_VARIANT: Record<
  HolidayType,
  "default" | "secondary" | "warm" | "success" | "warning" | "outline"
> = {
  Public: "default",
  Bank: "secondary",
  School: "warm",
  Authorities: "outline",
  Optional: "outline",
  Observance: "outline",
};

export function HolidayBrowser({
  defaultCountry = "CZ",
  selectable = false,
  onSelectionChange,
  hideControls = false,
  className,
}: HolidayBrowserProps): React.ReactElement {
  const { toast } = useToast();
  const [country, setCountry] = React.useState(defaultCountry);
  const [year, setYear] = React.useState(CURRENT_YEAR);
  const [holidays, setHolidays] = React.useState<Holiday[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = React.useState(false);

  const [enabledTypes, setEnabledTypes] = React.useState<Set<HolidayType>>(
    () => new Set(HOLIDAY_TYPES.map((t) => t.value))
  );
  const [nationalOnly, setNationalOnly] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (defaultCountry) setCountry(defaultCountry);
  }, [defaultCountry]);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { data, error: e } = await api.GET("/holidays/{country}/{year}", {
          params: { path: { country, year } },
        });
        if (!active) return;
        if (e) throw new Error(apiError(e));
        const list = ((data as Holiday[] | undefined) ?? []).slice().sort((a, b) => {
          const da = parseDate(a.date);
          const db = parseDate(b.date);
          if (!da) return 1;
          if (!db) return -1;
          return da.getTime() - db.getTime();
        });
        setHolidays(list);
        setHasLoaded(true);
      } catch (err) {
        if (!active) return;
        const msg = apiError(err);
        setError(msg);
        toast({
          variant: "destructive",
          title: "Couldn't load holidays",
          description: msg,
        });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [country, year, toast]);

  const filtered = React.useMemo(() => {
    return holidays.filter((h) => {
      if (nationalOnly && !h.global) return false;
      const t = h.type as HolidayType | undefined;
      if (t && !enabledTypes.has(t)) return false;
      return true;
    });
  }, [holidays, enabledTypes, nationalOnly]);

  const toggleType = (t: HolidayType): void => {
    setEnabledTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const toggleSelection = (h: Holiday): void => {
    const key = holidayKey(h);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  React.useEffect(() => {
    if (!selectable || !onSelectionChange) return;
    const selectedHolidays = filtered.filter((h) => selected.has(holidayKey(h)));
    onSelectionChange(selectedHolidays);
  }, [selected, filtered, selectable, onSelectionChange]);

  return (
    <div className={cn("space-y-5", className)}>
      {!hideControls ? (
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="hb-country" className="text-xs">Country</Label>
            <CountrySelect
              id="hb-country"
              value={country}
              onValueChange={setCountry}
              className="w-56"
              aria-label="Holiday country"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Year</Label>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setYear((y) => y - 1)}
                aria-label="Previous year"
                disabled={loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="w-16 text-center font-serif text-lg font-semibold tabular-nums">
                {year}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setYear((y) => y + 1)}
                aria-label="Next year"
                disabled={loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <Globe2 className="h-4 w-4" aria-hidden="true" />
            <span aria-hidden="true" className="text-base leading-none">
              {COUNTRY_FLAG[country] ?? ""}
            </span>
            {countryName(country)}
          </div>
        </div>
      ) : null}

      {/* Filters */}
      <div className="rounded-xl border border-border/70 bg-card/60 p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Holiday type
            </legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {HOLIDAY_TYPES.map((t) => (
                <label key={t.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={enabledTypes.has(t.value)}
                    onCheckedChange={() => toggleType(t.value)}
                    aria-label={t.label}
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="ml-auto flex items-center gap-2.5">
            <Switch
              id="hb-national"
              checked={nationalOnly}
              onCheckedChange={setNationalOnly}
              aria-label="National holidays only"
            />
            <Label htmlFor="hb-national" className="text-sm">
              National only
            </Label>
          </div>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <ul className="space-y-3" aria-live="polite" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-20 w-full rounded-xl" />
            </li>
          ))}
          <span className="sr-only">Loading holidays…</span>
        </ul>
      ) : !loading && hasLoaded && filtered.length === 0 ? (
        <EmptyState
          icon={PartyPopper}
          title="No holidays match"
          description={
            holidays.length === 0
              ? `No public holidays found for ${countryName(country)} in ${year}.`
              : "Try enabling more holiday types or turning off the national-only filter."
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((h) => {
            const key = holidayKey(h);
            const isSelected = selected.has(key);
            const type = h.type as HolidayType | undefined;
            return (
              <li key={key}>
                <Card
                  className={cn(
                    "transition-colors",
                    isSelected && "border-primary ring-1 ring-primary/30"
                  )}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    {selectable ? (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelection(h)}
                        aria-label={`Select ${h.name}`}
                      />
                    ) : null}
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-highlight text-center">
                      <span className="text-base font-semibold leading-none">
                        {parseDate(h.date)?.getDate() ?? "—"}
                      </span>
                      <span className="text-[10px] uppercase text-muted-foreground">
                        {parseDate(h.date)?.toLocaleString("en-US", { month: "short" }) ?? ""}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{h.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatLongDate(h.date)}
                        {h.localName && h.localName !== h.name ? ` · ${h.localName}` : ""}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {type ? (
                          <Badge variant={TYPE_BADGE_VARIANT[type] ?? "outline"}>
                            {HOLIDAY_TYPE_LABEL[type] ?? type}
                          </Badge>
                        ) : null}
                        {h.global ? (
                          <Badge variant="success" className="gap-1">
                            <CalendarDays className="h-3 w-3" /> National
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function holidayKey(h: Holiday): string {
  return `${h.date}-${h.name}`;
}
