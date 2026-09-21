import { describe, expect, it } from "vitest";

import { narrowRange, parseFilters, parseScope, toSearchParams } from "./filters";

const WEEK = {
  from: "2026-09-20T12:00:00.000Z", // Mon 21 Sep 00:00 NZST
  to: "2026-09-27T11:00:00.000Z", // Mon 28 Sep 00:00 NZDT
};

describe("URL filters", () => {
  it("round-trips the shareable state and ignores unknown values", () => {
    const filters = parseFilters({
      category: "workshop,family,bogus",
      cost: "free",
      when: "weekend",
      cancelled: "show",
      q: " clay ",
    });

    expect(filters).toMatchObject({
      categories: ["workshop", "family"],
      costType: "free",
      when: "weekend",
      includeCancelled: true,
      q: "clay",
    });
    expect(toSearchParams("past", "2026-09-14", filters).toString()).toBe(
      "scope=past&week=2026-09-14&q=clay&category=workshop%2Cfamily&cost=free&when=weekend&cancelled=show",
    );
    expect(parseScope({ scope: "nope" })).toBe("this-week");
  });
});

describe("narrowRange", () => {
  it("limits the weekend to Saturday and Sunday", () => {
    expect(narrowRange(WEEK, "weekend")).toEqual({
      from: "2026-09-26T00:00:00.000+12:00",
      to: WEEK.to,
    });
  });

  it("returns null for today when today is outside the week", () => {
    expect(narrowRange(WEEK, "today", new Date("2026-10-02T00:00:00Z"))).toBeNull();
    expect(narrowRange(WEEK, "today", new Date("2026-09-22T00:00:00Z"))).toEqual({
      from: "2026-09-22T00:00:00.000+12:00",
      to: "2026-09-23T00:00:00.000+12:00",
    });
  });
});
