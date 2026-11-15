import { describe, expect, it } from "vitest";

import { getPickReason } from "./pick-reason";
import type { ActivityDate } from "@/types/activity";

function date(startsAt: string): ActivityDate {
  return { id: startsAt, startsAt, endsAt: null, timezone: "Pacific/Auckland", isAllDay: false, recurrenceRule: null };
}

describe("getPickReason", () => {
  it("calls out a single evening as one night only", () => {
    // Wed 18 Nov 19:30 in Hamilton
    expect(
      getPickReason({ category: "arts_music", dates: [date("2026-11-18T06:30:00.000Z")] }),
    ).toBe("One night only");
    // Sat 21 Nov 11:00
    expect(
      getPickReason({ category: "community", dates: [date("2026-11-20T22:00:00.000Z")] }),
    ).toBe("One day only");
  });

  it("prefers who it suits over how often it runs", () => {
    expect(
      getPickReason({ category: "family", dates: [date("2026-11-20T23:00:00.000Z")] }),
    ).toBe("Good with kids");
    expect(
      getPickReason({ category: "market", dates: [date("2026-11-20T19:30:00.000Z")] }),
    ).toBe("Market");
  });

  it("marks a short run and says nothing about a long one", () => {
    const sessions = (count: number) =>
      Array.from({ length: count }, (_, index) =>
        date(new Date(Date.UTC(2026, 10, 17, 6) + index * 86_400_000).toISOString()),
      );

    expect(getPickReason({ category: "arts_music", dates: sessions(3) })).toBe("Limited run");
    expect(getPickReason({ category: "arts_music", dates: sessions(7) })).toBeNull();
  });
});
