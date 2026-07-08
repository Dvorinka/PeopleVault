/**
 * Date helpers for birthdays, anniversaries, namedays and countdowns.
 * All date-only values are ISO `YYYY-MM-DD` strings (no timezone shifts).
 */

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

/** Parse a YYYY-MM-DD string into a local Date at midnight (no TZ drift). */
export function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Format a date as e.g. "March 14, 1992". */
export function formatLongDate(iso: string | null | undefined): string {
  const d = parseDate(iso);
  if (!d) return "";
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Format as "March 14" (no year). */
export function formatMonthDay(iso: string | null | undefined): string {
  const d = parseDate(iso);
  if (!d) return "";
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

/** Whole years between a past date and today. */
export function ageYears(birthISO: string | null | undefined): number | null {
  const birth = parseDate(birthISO);
  if (!birth) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age < 0 ? 0 : age;
}

/**
 * Days until the next occurrence of a month/day anniversary (birthday,
 * anniversary, nameday). Returns 0 for today, 365 for tomorrow-next-year edge.
 */
export function daysUntilNext(month: number, day: number, from = new Date()): number {
  const now = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let next = new Date(from.getFullYear(), month - 1, day);
  if (next < now) {
    next = new Date(from.getFullYear() + 1, month - 1, day);
  }
  const ms = next.getTime() - now.getTime();
  return Math.round(ms / 86_400_000);
}

/** Days until the next occurrence of an ISO date's month/day. */
export function daysUntilNextOccurrence(iso: string | null | undefined): number | null {
  const d = parseDate(iso);
  if (!d) return null;
  return daysUntilNext(d.getMonth() + 1, d.getDate());
}

/** Human countdown label: "Today!", "Tomorrow", "in 3 days", "in 2 weeks". */
export function countdownLabel(days: number | null): string {
  if (days === null) return "";
  if (days === 0) return "Today!";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `in ${days} days`;
  if (days < 14) return "in 1 week";
  if (days < 30) return `in ${Math.round(days / 7)} weeks`;
  if (days < 60) return "in 1 month";
  return `in ${Math.round(days / 30)} months`;
}

/** The age someone will turn at their next birthday. */
export function ageTurning(birthISO: string | null | undefined): number | null {
  const birth = parseDate(birthISO);
  if (!birth) return null;
  const now = new Date();
  let turning = now.getFullYear() - birth.getFullYear();
  const thisYearBirthday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
  if (thisYearBirthday < now) turning += 1;
  return turning;
}

/** Relative "2 days ago" / "just now" for timestamps. */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.round(days / 365);
  return `${years}y ago`;
}

/** Initials from a full name, e.g. "Ada Lovelace" -> "AL". */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** A deterministic warm gradient class based on a string seed (for avatars). */
const AVATAR_GRADIENTS = [
  "from-rose-400 to-orange-300",
  "from-amber-400 to-rose-300",
  "from-emerald-400 to-teal-300",
  "from-sky-400 to-indigo-300",
  "from-violet-400 to-fuchsia-300",
  "from-orange-400 to-amber-300",
  "from-teal-400 to-emerald-300",
  "from-indigo-400 to-sky-300",
];

export function avatarGradient(seed: string | null | undefined): string {
  let hash = 0;
  const s = seed ?? "";
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx]!;
}
