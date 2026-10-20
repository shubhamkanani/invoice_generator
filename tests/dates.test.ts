import { describe, expect, it } from "vitest";
import { addDaysISO, formatDateISO, isValidISODate, todayISO } from "@/lib/dates";

// vitest.config.ts pins TZ=America/Los_Angeles, where UTC-midnight dates show the previous day.

describe("dates", () => {
  it("uses the local calendar date for today", () => {
    expect(todayISO(new Date(2026, 9, 20, 23, 30))).toBe("2026-10-20");
  });

  it("adds days across month and year ends", () => {
    expect(addDaysISO("2026-10-20", 30)).toBe("2026-11-19");
    expect(addDaysISO("2026-12-15", 30)).toBe("2027-01-14");
    expect(addDaysISO("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("formats a calendar date without shifting it a day", () => {
    expect(formatDateISO("2026-11-19")).toBe("Nov 19, 2026");
  });

  it("formats a blank or invalid date as an empty string instead of throwing", () => {
    expect(formatDateISO("")).toBe("");
    expect(formatDateISO("2026-02-30")).toBe("");
  });

  it("validates real calendar dates in YYYY-MM-DD form", () => {
    expect(isValidISODate("2026-02-28")).toBe(true);
    expect(isValidISODate("2026-02-30")).toBe(false);
    expect(isValidISODate("20261019")).toBe(false);
  });
});
