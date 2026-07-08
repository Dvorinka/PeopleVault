import { describe, expect, it } from "vitest";

import {
  ageYears,
  countdownLabel,
  daysUntilNext,
  initials,
  parseDate,
  toISODate,
} from "@/lib/date";

describe("parseDate / toISODate", () => {
  it("parses YYYY-MM-DD without timezone drift", () => {
    const d = parseDate("1992-03-14");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(1992);
    expect(d!.getMonth()).toBe(2);
    expect(d!.getDate()).toBe(14);
  });

  it("round-trips through toISODate", () => {
    expect(toISODate(new Date(1992, 2, 14))).toBe("1992-03-14");
  });

  it("returns null for invalid input", () => {
    expect(parseDate(null)).toBeNull();
    expect(parseDate("not-a-date")).toBeNull();
  });
});

describe("ageYears", () => {
  it("computes whole years", () => {
    const now = new Date();
    const birth = new Date(now.getFullYear() - 30, now.getMonth(), now.getDate() + 1);
    expect(ageYears(toISODate(birth))).toBe(29);
  });
});

describe("daysUntilNext", () => {
  it("returns 0 for today", () => {
    const now = new Date(2024, 5, 15);
    expect(daysUntilNext(6, 15, now)).toBe(0);
  });

  it("returns 1 for tomorrow", () => {
    const now = new Date(2024, 5, 15);
    expect(daysUntilNext(6, 16, now)).toBe(1);
  });

  it("wraps to next year for a past date", () => {
    const now = new Date(2024, 5, 15);
    expect(daysUntilNext(6, 10, now)).toBe(360);
  });
});

describe("countdownLabel", () => {
  it("labels common values", () => {
    expect(countdownLabel(0)).toBe("Today!");
    expect(countdownLabel(1)).toBe("Tomorrow");
    expect(countdownLabel(3)).toBe("in 3 days");
    expect(countdownLabel(10)).toBe("in 1 week");
    expect(countdownLabel(null)).toBe("");
  });
});

describe("initials", () => {
  it("extracts initials from a full name", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("Grace")).toBe("GR");
    expect(initials(null)).toBe("?");
  });
});
