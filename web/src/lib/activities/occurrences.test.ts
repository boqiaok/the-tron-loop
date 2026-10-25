import { describe, expect, it } from "vitest";

import {
  formatCadence,
  formatSessionDays,
  formatSessionSpan,
  formatSessionTimes,
  groupByDay,
  groupByWeekday,
} from "./occurrences";
import type { Activity, ActivityDate } from "@/types/activity";

function date(id: string, startsAt: string, recurrenceRule: string | null = null): ActivityDate {
  return { id, startsAt, endsAt: null, timezone: "Pacific/Auckland", isAllDay: false, recurrenceRule };
}

function activity(id: string, dates: ActivityDate[], fields: Partial<Activity> = {}): Activity {
  return { id, title: id, category: "family", venue: null, dates, ...fields } as unknown as Activity;
}

function at(venueId: string): Pick<Activity, "venue"> {
  return { venue: { id: venueId, name: venueId } as Activity["venue"] };
}

describe("groupByDay", () => {
  it("lists each activity under its local day, in time order", () => {
    const groups = groupByDay([
      // 09:00 Sat in Auckland (UTC+12)
      activity("market", [date("m1", "2026-09-25T21:00:00.000Z")]),
      // 10:00 Sun
      activity("gig", [date("m2", "2026-09-26T22:00:00.000Z")]),
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
  it("lists an activity on four or more days once, in a trailing Ongoing group", () => {
    const groups = groupByDay([
      activity("competition", daily("c", 7)),
      activity("lego", [date("l", "2026-09-23T03:30:00.000Z")]),
    ]);

    expect(groups.map((group) => group.key)).toEqual(["2026-09-23", "ongoing"]);
    expect(groups[0].occurrences.map((item) => item.activity.id)).toEqual(["lego"]);
    expect(groups[1].label).toBe("Ongoing");
    expect(groups[1].occurrences).toHaveLength(1);
    expect(groups[1].occurrences[0]).toMatchObject({
      date: { id: "c0" },
      series: { kind: "ongoing", days: 7, otherVenues: 0 },
    });
    expect(groups[1].occurrences[0].sessions).toHaveLength(7);
  });

  it("lists an activity on three days once, under its first day", () => {
    const groups = groupByDay([activity("expo", daily("e", 3))]);

    expect(groups.map((group) => group.key)).toEqual(["2026-09-22"]);
    expect(groups[0].occurrences).toHaveLength(1);
    expect(groups[0].occurrences[0]).toMatchObject({
      date: { id: "e0" },
      series: { kind: "dated", days: 3, otherVenues: 0 },
    });
  });

  it("lists a programme run at several venues once, under its earliest session", () => {
    const [tue, wed, thu, fri] = daily("d", 4);
    const groups = groupByDay([
      activity("rhyme-thu", [thu], { title: "Wriggle & Rhyme", ...at("dinsdale") }),
      activity("rhyme-tue", [tue], { title: "Wriggle & Rhyme", ...at("chartwell") }),
      activity("rhyme-wed", [wed], { title: "Wriggle  &  rhyme ", ...at("central") }),
      activity("rhyme-fri", [fri], { title: "Wriggle & Rhyme", ...at("rototuna") }),
      activity("lego", [wed], { title: "LEGO Club", ...at("central") }),
    ]);

    expect(groups.map((group) => group.key)).toEqual(["2026-09-22", "2026-09-23"]);
    expect(groups[0].occurrences).toHaveLength(1);
    expect(groups[0].occurrences[0]).toMatchObject({
      activity: { id: "rhyme-tue" },
      date: { id: "d0" },
      series: { kind: "dated", days: 4, otherVenues: 3 },
    });
    expect(groups[0].occurrences[0].sessions?.map((item) => item.id)).toEqual(["d0", "d1", "d2", "d3"]);
    expect(groups[1].occurrences.map((item) => item.activity.id)).toEqual(["lego"]);
  });

  it("links a series to its nearest venue when sorting by distance", () => {
    const [tue, , thu] = daily("d", 3);
    const groups = groupByDay(
      [
        activity("near", [thu], { title: "Storytime", ...at("dinsdale") }),
        activity("far", [tue], { title: "Storytime", ...at("chartwell") }),
      ],
      { keepOrder: true },
    );

    expect(groups.map((group) => group.key)).toEqual(["2026-09-24"]);
    expect(groups[0].occurrences[0]).toMatchObject({
      activity: { id: "near" },
      series: { kind: "dated", days: 2, otherVenues: 1 },
    });
  });

  it("keeps activities with the same title in different categories apart", () => {
    const [tue] = daily("d", 1);
    const groups = groupByDay([
      activity("kids", [tue], { title: "Art Club", ...at("a") }),
      activity("adults", [tue], { title: "Art Club", category: "community", ...at("b") }),
    ]);

    expect(groups[0].occurrences.map((item) => item.activity.id)).toEqual(["kids", "adults"]);
    expect(groups[0].occurrences.every((item) => !item.series)).toBe(true);
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
    const [tue, wed, , fri] = daily("d", 4);
    expect(formatSessionDays([tue, wed, wed, fri])).toBe("Tue · Wed · Fri");
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
