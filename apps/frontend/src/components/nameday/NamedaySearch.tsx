import * as React from "react";
import { Search, Sparkles, X } from "lucide-react";
import type { components } from "@peoplevault/api-client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, apiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { COUNTRY_FLAG, countryName } from "@/lib/constants";
import { formatMonthDayFromParts } from "@/lib/date";
import { cn } from "@/lib/utils";

type NamedaySearchResult = components["schemas"]["NamedaySearchResult"];

/**
 * A single flattened nameday match: one country + one date/name pair.
 * The backend returns {@link NamedaySearchResult} entries grouped by country
 * with a `dates` array; we flatten them for display and selection.
 */
export interface NamedayMatch {
  country: string;
  day: number;
  month: number;
  name: string;
}

export interface NamedaySearchProps {
  /** Initial query (e.g. the person's first name) to pre-seed the search. */
  initialQuery?: string;
  /** Restrict results to a single country code (case-insensitive). */
  country?: string | null;
  /** Called when the user picks a result. */
  onSelect?: (result: NamedayMatch) => void;
  /** Compact mode (used inside dialogs). */
  compact?: boolean;
  className?: string;
  inputId?: string;
}

interface GroupedResult {
  country: string;
  results: NamedayMatch[];
}

export function NamedaySearch({
  initialQuery = "",
  country,
  onSelect,
  compact,
  className,
  inputId,
}: NamedaySearchProps): React.ReactElement {
  const { toast } = useToast();
  const [query, setQuery] = React.useState(initialQuery);
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = React.useState<NamedayMatch[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  React.useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      setHasSearched(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { data, error: e } = await api.GET("/namedays/search", {
          params: { query: { q } },
        });
        if (!active) return;
        if (e) throw new Error(apiError(e));
        // The API returns NamedaySearchResult[] directly (one entry per
        // matching country, each with a `dates` array). Flatten into
        // individual NamedayMatch entries for display/selection.
        const grouped = (data ?? []) as NamedaySearchResult[];
        const all: NamedayMatch[] = grouped.flatMap((r) =>
          (r.dates ?? []).map((d) => ({
            country: (r.country ?? "").toUpperCase(),
            day: d.day ?? 0,
            month: d.month ?? 0,
            name: d.name ?? "",
          }))
        );
        const filtered = country
          ? all.filter(
              (r) => r.country.toUpperCase() === country.toUpperCase()
            )
          : all;
        setResults(filtered);
        setHasSearched(true);
        setActiveIndex(0);
      } catch (err) {
        if (!active) return;
        const msg = apiError(err);
        setError(msg);
        toast({
          variant: "destructive",
          title: "Nameday search failed",
          description: msg,
        });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [debouncedQuery, country, toast]);

  const grouped = React.useMemo<GroupedResult[]>(() => {
    const map = new Map<string, NamedayMatch[]>();
    for (const r of results) {
      const key = (r.country ?? "").toUpperCase();
      const list = map.get(key);
      if (list) list.push(r);
      else map.set(key, [r]);
    }
    return Array.from(map.entries())
      .map(([c, rs]) => ({
        country: c,
        results: rs.sort((a, b) => a.month - b.month || a.day - b.day),
      }))
      .sort((a, b) => countryName(a.country).localeCompare(countryName(b.country)));
  }, [results]);

  const flatResults = React.useMemo(
    () => grouped.flatMap((g) => g.results),
    [grouped]
  );

  const handleKey = (e: React.KeyboardEvent): void => {
    if (flatResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = flatResults[activeIndex];
      if (r && onSelect) onSelect(r);
    }
  };

  let runningIndex = -1;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={inputId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a name (min. 2 characters)…"
          className="pl-9"
          aria-label="Search namedays by name"
          aria-autocomplete="list"
          aria-expanded={flatResults.length > 0}
          autoComplete="off"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <ul className="space-y-2" aria-live="polite" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-14 w-full rounded-xl" />
            </li>
          ))}
          <span className="sr-only">Searching namedays…</span>
        </ul>
      ) : !loading && hasSearched && flatResults.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-8 text-center">
          <Sparkles className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">No namedays found for “{debouncedQuery}”.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try a different spelling or another name.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <section key={group.country} aria-label={countryName(group.country)}>
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span aria-hidden="true" className="text-sm leading-none">
                  {COUNTRY_FLAG[group.country] ?? ""}
                </span>
                {countryName(group.country)}
                <span className="text-muted-foreground/70">({group.country})</span>
              </h3>
              <ul role="listbox" aria-label={`Namedays in ${countryName(group.country)}`}>
                {group.results.map((r) => {
                  runningIndex += 1;
                  const idx = runningIndex;
                  const isActive = idx === activeIndex;
                  return (
                    <li key={`${r.country}-${r.month}-${r.day}-${r.name}`} role="option" aria-selected={isActive}>
                      <button
                        type="button"
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => onSelect?.(r)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-3 py-2.5 text-left transition-all hover:border-primary/40 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isActive && "border-primary/50 bg-accent ring-1 ring-primary/30"
                        )}
                      >
                        <div className="flex h-9 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-highlight text-xs font-semibold text-foreground">
                          <span className="leading-none">{r.day}</span>
                          <span className="text-[10px] uppercase text-muted-foreground">
                            {formatMonthDayFromParts(r.month, r.day).split(" ")[0]?.slice(0, 3)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{r.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatMonthDayFromParts(r.month, r.day)}
                          </p>
                        </div>
                        {onSelect ? (
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            Select
                          </Badge>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {!compact && !hasSearched && !loading ? (
        <p className="text-center text-xs text-muted-foreground">
          Search across all supported countries.
        </p>
      ) : null}
    </div>
  );
}
