import { describe, expect, it } from "vitest";

import {
  addMinutesToLocalDateTime,
  fromAucklandInputValue,
  toAucklandInputValue,
} from "./admin-date-time";

describe("admin activity date-time conversion", () => {
  it("converts a local winter time to an ISO instant", () => {
    expect(
      new Date(fromAucklandInputValue("2026-08-18T09:30")).toISOString(),
    ).toBe(
      "2026-08-17T21:30:00.000Z",
    );
  });

  it("round-trips a daylight-saving time in Auckland", () => {
    const iso = fromAucklandInputValue("2026-12-18T18:45");

    expect(toAucklandInputValue(iso, false)).toBe("2026-12-18T18:45");
  });

  it("uses a date-only value for an all-day activity", () => {
    expect(
      toAucklandInputValue("2026-08-17T12:00:00.000Z", true),
    ).toBe("2026-08-18");
  });

  it("creates a default end time from a local start time", () => {
    expect(addMinutesToLocalDateTime("2026-08-18T09:00", 60)).toBe(
      "2026-08-18T10:00",
    );
  });
});
