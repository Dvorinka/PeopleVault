import type { components } from "@peoplevault/api-client";

// Concrete (non-optional) enums mirrored from the OpenAPI schema.
export type EventType = NonNullable<components["schemas"]["Event"]["type"]>;
export type TimelineType = NonNullable<components["schemas"]["TimelineEntry"]["type"]>;
export type Theme = NonNullable<components["schemas"]["UserSettings"]["theme"]>;

export const NAMEDAY_COUNTRIES: { code: string; name: string; flag: string }[] = [
  { code: "CZ", name: "Czech Republic", flag: "CZ" },
  { code: "SK", name: "Slovakia", flag: "SK" },
  { code: "PL", name: "Poland", flag: "PL" },
  { code: "HU", name: "Hungary", flag: "HU" },
  { code: "AT", name: "Austria", flag: "AT" },
  { code: "DE", name: "Germany", flag: "DE" },
];

export const COUNTRY_NAME: Record<string, string> = Object.fromEntries(
  NAMEDAY_COUNTRIES.map((c) => [c.code, c.name])
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
