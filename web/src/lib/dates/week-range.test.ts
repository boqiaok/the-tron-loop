import { describe, expect, it } from "vitest";

import { getWeekRange } from "./week-range";

describe("getWeekRange", () => {
  it("returns Monday-to-Monday boundaries in Pacific/Auckland", () => {
    const range = getWeekRange(0, new Date("2026-08-19T12:00:00Z"));

    expect(range.from).toBe("2026-08-17T00:00:00.000+12:00");
    expect(range.to).toBe("2026-08-24T00:00:00.000+12:00");
    expect(range.label).toBe("17 August – 23 August 2026");
  });

  it("returns the immediately following week", () => {
    const range = getWeekRange(1, new Date("2026-08-19T12:00:00Z"));

    expect(range.from).toBe("2026-08-24T00:00:00.000+12:00");
    expect(range.to).toBe("2026-08-31T00:00:00.000+12:00");
  });

  it("preserves local midnight across the daylight-saving boundary", () => {
    const range = getWeekRange(0, new Date("2026-04-01T12:00:00Z"));
    const durationHours =
      (new Date(range.to).getTime() - new Date(range.from).getTime()) /
      (60 * 60 * 1000);

    expect(range.from).toBe("2026-03-30T00:00:00.000+13:00");
    expect(range.to).toBe("2026-04-06T00:00:00.000+12:00");
    expect(durationHours).toBe(169);
  });
});
