import { describe, expect, it } from "vitest";

import { getBackTarget, getGoodToKnow, pickOccurrence } from "./detail";
import type { ActivityDate } from "@/types/activity";

const NOW = new Date("2026-09-22T00:00:00Z"); // Tue 22 Sep in Hamilton

function date(id: string, startsAt: string): ActivityDate {
  return { id, startsAt, endsAt: null, timezone: "Pacific/Auckland", isAllDay: false, recurrenceRule: null };
}

describe("pickOccurrence", () => {
  const dates = [
    date("past", "2026-09-15T01:00:00Z"),
    date("soon", "2026-09-26T01:00:00Z"),
    date("later", "2026-10-03T01:00:00Z"),
  ];

  it("prefers the linked date, then the next upcoming one", () => {
    expect(pickOccurrence(dates, "later", NOW)?.id).toBe("later");
    expect(pickOccurrence(dates, "missing", NOW)?.id).toBe("soon");
  });
});

describe("getBackTarget", () => {
  it("returns to the scope that lists the occurrence", () => {
    expect(getBackTarget(date("a", "2026-09-26T01:00:00Z"), NOW).href).toBe("/whats-on");
    expect(getBackTarget(date("b", "2026-09-30T01:00:00Z"), NOW).href).toBe(
      "/whats-on?scope=next-week",
    );
    expect(getBackTarget(date("c", "2026-09-10T01:00:00Z"), NOW).href).toBe(
      "/whats-on?scope=past&week=2026-09-07",
    );
    expect(
      getBackTarget({ startsAt: "2026-09-26T01:00:00Z", recurrenceRule: "FREQ=WEEKLY" }, NOW).label,
    ).toBe("Back to regular activities");
  });
});

describe("getGoodToKnow", () => {
  it("lists only facts we hold", () => {
    expect(
      getGoodToKnow({ environment: "indoor", scheduleMode: "window", visitMinutes: 45 }),
    ).toEqual(["Indoors", "Drop in any time, about 45 minutes"]);
  });
});
