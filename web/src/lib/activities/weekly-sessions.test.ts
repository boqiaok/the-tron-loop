import { describe, expect, it } from "vitest";

import { filterRecurring, groupWeeklySessions } from "./weekly-sessions";
import { EMPTY_FILTERS } from "./filters";
import type { Activity, ActivityDate } from "@/types/activity";

function date(id: string, startsAt: string, recurrenceRule: string | null = null): ActivityDate {
  return { id, startsAt, endsAt: null, timezone: "Pacific/Auckland", isAllDay: false, recurrenceRule };
}

function activity(
  id: string,
  dates: ActivityDate[],
  fields: Partial<Activity> = {},
): Activity {
  return {
    id,
    title: id,
    category: "family",
    costType: "free",
    summary: null,
    description: "",
    tags: [],
    venue: { id: `${id}-venue`, name: `${id} Library - Te Whare`, suburb: null },
    dates,
    ...fields,
  } as unknown as Activity;
}

describe("groupWeeklySessions", () => {
  it("folds one session at several libraries into a row, in weekday order", () => {
    const groups = groupWeeklySessions(
      [
        // Wed 18 Nov 10:30 in Hamilton (UTC+13)
        activity("hillcrest", [date("h", "2026-11-17T21:30:00.000Z")], {
          title: "Storytime",
          venue: { id: "h", name: "Hillcrest Library at Hamilton", suburb: null } as Activity["venue"],
        }),
        // Mon 16 Nov 10:30
        activity("glenview", [date("g", "2026-11-15T21:30:00.000Z")], {
          title: "Storytime",
          venue: { id: "g", name: "Glenview Library - Mangakootukutuku", suburb: null } as Activity["venue"],
        }),
      ],
      [],
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Children and families");
    const [series] = groups[0].series;
    expect(series.venues).toBe(2);
    expect(series.activity.id).toBe("glenview");
    expect(series.sessions.map((session) => [session.label, session.place])).toEqual([
      ["Mon 10:30", "Glenview Library"],
      ["Wed 10:30", "Hillcrest Library at Hamilton"],
    ]);
  });

  it("lists weekly-rule activities with their weekdays and splits by audience", () => {
    const groups = groupWeeklySessions(
      [activity("lego", [date("l", "2026-11-18T02:30:00.000Z")])],
      [
        activity(
          "English Chat",
          [date("e", "2026-08-04T22:00:00.000Z", "FREQ=WEEKLY;BYDAY=TU,TH")],
          { category: "community" },
        ),
      ],
    );

    expect(groups.map((group) => group.label)).toEqual([
      "Children and families",
      "Adults and everyone",
    ]);
    expect(groups[1].series[0].recurring).toBe(true);
    expect(groups[1].series[0].sessions[0].label).toBe("Tue, Thu 10:00");
  });
});

describe("filterRecurring", () => {
  const chat = activity(
    "English Chat",
    [date("e", "2026-08-04T22:00:00.000Z", "FREQ=WEEKLY;BYDAY=TU")],
    { category: "community" },
  );
  const quiz = activity(
    "Quiz",
    [date("q", "2026-08-08T07:00:00.000Z", "FREQ=WEEKLY;BYDAY=SA")],
    { category: "community", costType: "paid" },
  );

  it("applies search, cost and category like the weekly listing", () => {
    expect(filterRecurring([chat, quiz], { ...EMPTY_FILTERS, q: "english" })).toEqual([chat]);
    expect(filterRecurring([chat, quiz], { ...EMPTY_FILTERS, costType: "paid" })).toEqual([quiz]);
    expect(filterRecurring([chat, quiz], { ...EMPTY_FILTERS, categories: ["family"] })).toEqual([]);
  });

  it("keeps weekend and evening sessions for those filters", () => {
    expect(filterRecurring([chat, quiz], { ...EMPTY_FILTERS, when: "weekend" })).toEqual([quiz]);
    expect(filterRecurring([chat, quiz], { ...EMPTY_FILTERS, when: "evening" })).toEqual([quiz]);
  });
});
