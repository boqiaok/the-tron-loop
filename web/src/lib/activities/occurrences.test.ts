import { describe, expect, it } from "vitest";

import { formatCadence, groupByDay, groupByWeekday } from "./occurrences";
import type { Activity, ActivityDate } from "@/types/activity";

function date(id: string, startsAt: string, recurrenceRule: string | null = null): ActivityDate {
  return { id, startsAt, endsAt: null, timezone: "Pacific/Auckland", isAllDay: false, recurrenceRule };
}

function activity(id: string, dates: ActivityDate[]): Activity {
  return { id, title: id, dates } as unknown as Activity;
}

describe("groupByDay", () => {
  it("emits one row per occurrence under its local day, in time order", () => {
    const groups = groupByDay([
      // 09:00 Sat and 10:00 Sun in Auckland (UTC+12)
      activity("market", [date("m1", "2026-09-25T21:00:00.000Z"), date("m2", "2026-09-26T22:00:00.000Z")]),
      // 08:00 Sat
      activity("walk", [date("w1", "2026-09-25T20:00:00.000Z")]),
    ]);

    expect(groups.map((group) => group.label)).toEqual(["Sat 26 Sep", "Sun 27 Sep"]);
    expect(groups[0].occurrences.map((item) => item.date.id)).toEqual(["w1", "m1"]);
    expect(groups[1].occurrences.map((item) => item.date.id)).toEqual(["m2"]);
  });

  it("keeps the API order inside a day when sorting by distance", () => {
    const groups = groupByDay(
      [
        activity("near", [date("n", "2026-09-26T02:00:00.000Z")]),
        activity("far", [date("f", "2026-09-25T22:00:00.000Z")]),
      ],
      { keepOrder: true },
    );

    expect(groups[0].occurrences.map((item) => item.activity.id)).toEqual(["near", "far"]);
  });

  it("drops occurrences that start before 17:00 for the evening filter", () => {
    const groups = groupByDay(
      [
        activity("gig", [
          date("day", "2026-09-26T01:00:00.000Z"), // 13:00
          date("night", "2026-09-26T07:30:00.000Z"), // 19:30
        ]),
      ],
      { eveningOnly: true },
    );

    expect(groups.flatMap((group) => group.occurrences.map((item) => item.date.id))).toEqual(["night"]);
  });
});

describe("groupByWeekday", () => {
  it("lists a recurring activity under every weekday in its rule", () => {
    const groups = groupByWeekday([
      activity("english", [date("e", "2026-09-22T06:00:00.000Z", "FREQ=WEEKLY;BYDAY=TU,TH")]),
    ]);

    expect(groups.map((group) => group.label)).toEqual(["Tuesday", "Thursday"]);
  });

  it("describes the cadence", () => {
    expect(formatCadence({ recurrenceRule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=MO" })).toBe("Every two weeks");
    expect(formatCadence({ recurrenceRule: "FREQ=WEEKLY;BYDAY=MO" })).toBe("Weekly");
  });
});
