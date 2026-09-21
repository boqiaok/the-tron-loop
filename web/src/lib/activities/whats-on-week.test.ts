import { describe, expect, it } from "vitest";

import { getAdjacentWeeks, resolveWeek } from "./whats-on-week";

const NOW = new Date("2026-09-22T00:00:00Z"); // Tue 22 Sep in Hamilton

describe("resolveWeek", () => {
  it("falls back to last week for a missing or future past week", () => {
    expect(resolveWeek("past", undefined, NOW).slug).toBe("2026-09-14");
    expect(resolveWeek("past", "2026-09-28", NOW).slug).toBe("2026-09-14");
    expect(resolveWeek("past", "2026-08-31", NOW).slug).toBe("2026-08-31");
  });
});

describe("getAdjacentWeeks", () => {
  it("links this week back to the archive and forward to next week", () => {
    expect(getAdjacentWeeks("this-week", "2026-09-21", NOW)).toEqual({
      previous: { scope: "past", week: "2026-09-14" },
      next: { scope: "next-week" },
    });
  });

  it("returns to this week from last week, across the DST change", () => {
    expect(getAdjacentWeeks("past", "2026-09-14", NOW).next).toEqual({ scope: "this-week" });
    expect(getAdjacentWeeks("next-week", "2026-09-28", NOW)).toEqual({
      previous: { scope: "this-week" },
    });
  });
});
