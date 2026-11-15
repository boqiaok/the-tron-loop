import { describe, expect, it } from "vitest";

import { toCoverRows } from "./cover-rows";
import type { Activity } from "@/types/activity";
import type { WeeklyGuideItem } from "@/types/weekly-guide";

function item(title: string, fields: Partial<Activity> = {}, kind: string | null = null): WeeklyGuideItem {
  return {
    kind,
    note: null,
    activity: {
      title,
      status: "published",
      costType: "paid",
      costAmountFrom: 12.5,
      currency: "NZD",
      venue: { id: "v", name: "Gallagher Academy - Te Whare Tapere Iti" },
      // Wed 18 Nov 19:00 in Hamilton
      dates: [{ id: "d", startsAt: "2026-11-18T06:00:00.000Z", endsAt: null, timezone: "Pacific/Auckland", isAllDay: false, recurrenceRule: null }],
      ...fields,
    } as unknown as Activity,
  };
}

describe("toCoverRows", () => {
  it("says what, when, where and how much for each pick", () => {
    const { rows, more } = toCoverRows({
      items: [item("Convergence", {}, "Piano and taonga pūoro concert")],
    });

    expect(more).toBe(0);
    expect(rows).toEqual([
      {
        position: 1,
        title: "Convergence",
        kind: "Piano and taonga pūoro concert",
        details: "Wed 18 Nov, 19:00 · Gallagher Academy",
        cost: { label: "From $12.50", free: false },
      },
    ]);
  });

  it("leaves out cancelled picks and counts those past the eighth", () => {
    const items = Array.from({ length: 10 }, (_, index) => item(`Pick ${index + 1}`));
    items[1] = item("Called off", { status: "cancelled" });

    const { rows, more } = toCoverRows({ items });

    expect(rows.map((row) => row.title)).not.toContain("Called off");
    expect(rows).toHaveLength(8);
    expect(rows[1]).toMatchObject({ position: 2, title: "Pick 3" });
    expect(more).toBe(1);
  });
});
