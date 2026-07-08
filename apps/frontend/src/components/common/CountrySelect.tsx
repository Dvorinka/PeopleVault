import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { COUNTRY_FLAG, NAMEDAY_COUNTRIES, countryInfo } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface CountrySelectProps {
  value: string;
  onValueChange: (code: string) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  allowNone?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * Searchable country dropdown. Renders all 19 nameday-API countries with
 * flag emojis + name, filterable by typing. Falls back gracefully for
 * values that are not in the known list (shows the raw code).
 */
export function CountrySelect({
  value,
  onValueChange,
  disabled,
  id,
  placeholder = "Select country",
  allowNone = false,
  className,
  ...rest
}: CountrySelectProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  const selected = countryInfo(value);
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = React.useMemo(() => {
    if (!normalizedQuery) return NAMEDAY_COUNTRIES;
    return NAMEDAY_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(normalizedQuery) ||
        c.code.toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery]);

  const select = (code: string): void => {
    onValueChange(code);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={rest["aria-label"] ?? "Country"}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="flex items-center gap-2 truncate">
            {selected ? (
              <>
                <span aria-hidden="true" className="text-base leading-none">
                  {COUNTRY_FLAG[selected.code] ?? ""}
                </span>
                <span className="truncate">{selected.name}</span>
                <span className="text-xs text-muted-foreground">({selected.code})</span>
              </>
            ) : allowNone && !value ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : value ? (
              <span className="truncate">{value}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
        onOpenAutoFocus={(e) => {
          // Prevent the popover from stealing focus from the trigger on open;
          // we move focus to the search input explicitly below.
          e.preventDefault();
        }}
      >
        <div className="border-b border-border/70 p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search countries…"
              className="pl-8"
              aria-label="Search countries"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (filtered.length > 0) select(filtered[0]!.code);
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
            />
          </div>
        </div>
        <ul
          role="listbox"
          aria-label="Countries"
          className="max-h-64 overflow-y-auto p-1"
        >
          {allowNone ? (
            <li role="option" aria-selected={!value}>
              <button
                type="button"
                onClick={() => select("")}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent focus:bg-accent focus:outline-none",
                  !value && "bg-accent"
                )}
              >
                <span className="flex h-4 w-4 items-center justify-center">
                  {!value ? <Check className="h-4 w-4 text-primary" /> : null}
                </span>
                <span className="text-muted-foreground">None</span>
              </button>
            </li>
          ) : null}
          {filtered.map((c) => {
            const isActive = selected?.code === c.code;
            return (
              <li key={c.code} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => select(c.code)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent focus:bg-accent focus:outline-none",
                    isActive && "bg-accent"
                  )}
                >
                  <span className="flex h-4 w-4 items-center justify-center">
                    {isActive ? <Check className="h-4 w-4 text-primary" /> : null}
                  </span>
                  <span aria-hidden="true" className="text-base leading-none">
                    {COUNTRY_FLAG[c.code] ?? ""}
                  </span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.code}</span>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && !allowNone ? (
            <li className="px-3 py-4 text-center text-sm text-muted-foreground">
              No countries match “{query}”.
            </li>
          ) : null}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
