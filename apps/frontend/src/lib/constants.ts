import type { components } from "@peoplevault/api-client";

// Concrete (non-optional) enums mirrored from the OpenAPI schema.
export type EventType = NonNullable<components["schemas"]["Event"]["type"]>;
export type TimelineType = NonNullable<components["schemas"]["TimelineEntry"]["type"]>;
export type Theme = NonNullable<components["schemas"]["UserSettings"]["theme"]>;
// Holiday types come as an array of strings in `Holiday.holidayTypes` (the
// backend OpenAPI schema no longer has a single `type` field). The valid
// values come from date.nager.at.
export type HolidayType =
  | "Public"
  | "Bank"
  | "School"
  | "Authorities"
  | "Optional"
  | "Observance";

export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
}

// All 19 countries supported by the nameday API (abalin.net).
// Codes are ISO 3166-1 alpha-2, stored uppercase in the frontend.
export const NAMEDAY_COUNTRIES: CountryInfo[] = [
  { code: "AT", name: "Austria", flag: "AT" },
  { code: "BG", name: "Bulgaria", flag: "BG" },
  { code: "CZ", name: "Czech Republic", flag: "CZ" },
  { code: "DE", name: "Germany", flag: "DE" },
  { code: "DK", name: "Denmark", flag: "DK" },
  { code: "EE", name: "Estonia", flag: "EE" },
  { code: "ES", name: "Spain", flag: "ES" },
  { code: "FI", name: "Finland", flag: "FI" },
  { code: "FR", name: "France", flag: "FR" },
  { code: "GR", name: "Greece", flag: "GR" },
  { code: "HR", name: "Croatia", flag: "HR" },
  { code: "HU", name: "Hungary", flag: "HU" },
  { code: "IT", name: "Italy", flag: "IT" },
  { code: "LT", name: "Lithuania", flag: "LT" },
  { code: "LV", name: "Latvia", flag: "LV" },
  { code: "PL", name: "Poland", flag: "PL" },
  { code: "SE", name: "Sweden", flag: "SE" },
  { code: "SK", name: "Slovakia", flag: "SK" },
  { code: "US", name: "United States", flag: "US" },
];

// Country code -> flag emoji (regional indicator symbols).
export const COUNTRY_FLAG: Record<string, string> = Object.fromEntries(
  NAMEDAY_COUNTRIES.map((c) => [c.code, regionalIndicatorEmoji(c.code)])
);

export const COUNTRY_NAME: Record<string, string> = Object.fromEntries(
  NAMEDAY_COUNTRIES.map((c) => [c.code, c.name])
);

/** Case-insensitive country info lookup (handles lowercase API results). */
export function countryInfo(code: string | null | undefined): CountryInfo | null {
  if (!code) return null;
  const upper = code.toUpperCase();
  return NAMEDAY_COUNTRIES.find((c) => c.code === upper) ?? null;
}

/** Display name for a country code, case-insensitive. Falls back to the raw code. */
export function countryName(code: string | null | undefined): string {
  return countryInfo(code)?.name ?? (code ? String(code).toUpperCase() : "");
}

/** Flag emoji for a country code, case-insensitive. */
export function countryFlag(code: string | null | undefined): string {
  return countryInfo(code)?.code ? COUNTRY_FLAG[countryInfo(code)!.code] ?? "" : "";
}

function regionalIndicatorEmoji(code: string): string {
  const A = 0x1f1e6;
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((ch) => A + (ch.charCodeAt(0) - "A".charCodeAt(0)))
  );
}

export const HOLIDAY_TYPES: { value: HolidayType; label: string }[] = [
  { value: "Public", label: "Public" },
  { value: "Bank", label: "Bank" },
  { value: "School", label: "School" },
  { value: "Authorities", label: "Authorities" },
  { value: "Optional", label: "Optional" },
  { value: "Observance", label: "Observance" },
];

export const HOLIDAY_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  HOLIDAY_TYPES.map((t) => [t.value, t.label])
);

export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "birthday", label: "Birthday" },
  { value: "anniversary", label: "Anniversary" },
  { value: "nameday", label: "Nameday" },
  { value: "wedding", label: "Wedding" },
  { value: "graduation", label: "Graduation" },
  { value: "holiday", label: "Holiday" },
  { value: "custom", label: "Custom" },
];

export const EVENT_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  EVENT_TYPES.map((e) => [e.value, e.label])
);

export const TIMELINE_TYPES: { value: TimelineType; label: string }[] = [
  { value: "birthday", label: "Birthday" },
  { value: "anniversary", label: "Anniversary" },
  { value: "met", label: "First met" },
  { value: "gift", label: "Gift" },
  { value: "vacation", label: "Vacation" },
  { value: "achievement", label: "Achievement" },
  { value: "memory", label: "Memory" },
  { value: "photo", label: "Photo" },
  { value: "reminder", label: "Reminder" },
  { value: "note", label: "Note" },
];

export const TIMELINE_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  TIMELINE_TYPES.map((t) => [t.value, t.label])
);

export const RELATIONSHIP_KINDS = [
  "partner",
  "spouse",
  "parent",
  "child",
  "sibling",
  "friend",
  "relative",
  "coworker",
  "mentor",
  "neighbor",
  "acquaintance",
  "other",
] as const;

export const COMMON_RELATIONSHIPS = [
  "Family",
  "Friend",
  "Partner",
  "Colleague",
  "Relative",
  "Neighbor",
  "Mentor",
  "Acquaintance",
];

export const LEAD_DAY_OPTIONS = [
  { value: 0, label: "Same day" },
  { value: 1, label: "1 day before" },
  { value: 3, label: "3 days before" },
  { value: 7, label: "1 week before" },
  { value: 14, label: "2 weeks before" },
  { value: 30, label: "1 month before" },
];
