import { describe, expect, it } from "vitest";

import {
  formatCadence,
  formatSessionSpan,
  formatSessionTimes,
  groupByDay,
  groupByWeekday,
} from "./occurrences";
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

function allDay(id: string, startsAt: string): ActivityDate {
  return { ...date(id, startsAt), isAllDay: true };
}

// Local midnight Tue 22 Sep 2026 in Auckland is 12:00 UTC the day before.
const daily = (prefix: string, days: number) =>
  Array.from({ length: days }, (_, day) =>
    allDay(`${prefix}${day}`, new Date(Date.UTC(2026, 8, 21 + day, 12)).toISOString()),
  );

describe("groupByDay ongoing and same-day rows", () => {
  it("lists an activity on four or more days once, in a leading Ongoing group", () => {
    const groups = groupByDay([
      activity("competition", daily("c", 7)),
      activity("lego", [date("l", "2026-09-23T03:30:00.000Z")]),
    ]);

    expect(groups.map((group) => group.key)).toEqual(["ongoing", "2026-09-23"]);
    expect(groups[0].label).toBe("Ongoing");
    expect(groups[0].occurrences).toHaveLength(1);
    expect(groups[0].occurrences[0]).toMatchObject({ date: { id: "c0" }, ongoingDays: 7 });
    expect(groups[0].occurrences[0].sessions).toHaveLength(7);
    expect(groups[1].occurrences.map((item) => item.activity.id)).toEqual(["lego"]);
  });

  it("keeps an activity on three days under each of its days", () => {
    const groups = groupByDay([activity("show", daily("s", 3))]);
    expect(groups.map((group) => group.key)).toEqual(["2026-09-22", "2026-09-23", "2026-09-24"]);
  });

  it("folds several sessions on one day into one row", () => {
    const groups = groupByDay([
      activity("glotron", [
        date("g3", "2026-09-26T07:00:00.000Z"), // 19:00
        date("g1", "2026-09-26T06:00:00.000Z"), // 18:00
        date("g2", "2026-09-26T06:30:00.000Z"), // 18:30
      ]),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].occurrences).toHaveLength(1);
    expect(groups[0].occurrences[0].date.id).toBe("g1");
    expect(groups[0].occurrences[0].sessions?.map((item) => item.id)).toEqual(["g1", "g2", "g3"]);
  });

  it("counts only the sessions left after the evening filter", () => {
    const groups = groupByDay(
      [
        activity("tours", [
          ...[22, 23, 24, 25].map((day) =>
            date(`day${day}`, new Date(Date.UTC(2026, 8, day, 0)).toISOString()),
          ), // 12:00 each day
          date("evening", "2026-09-25T07:00:00.000Z"), // 19:00 Fri
        ]),
      ],
      { eveningOnly: true },
    );

    expect(groups.map((group) => group.key)).toEqual(["2026-09-25"]);
  });

  it("describes the span and times of folded sessions", () => {
    expect(formatSessionSpan(daily("c", 6))).toBe("Tue 22 – Sun 27 Sep");
    expect(
      formatSessionTimes([
        date("a", "2026-09-26T06:00:00.000Z"),
        date("b", "2026-09-26T06:30:00.000Z"),
        date("c", "2026-09-26T07:00:00.000Z"),
        date("d", "2026-09-26T07:30:00.000Z"),
        date("e", "2026-09-27T06:00:00.000Z"),
      ]),
    ).toBe("18:00 · 18:30 · 19:00 +1");
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
