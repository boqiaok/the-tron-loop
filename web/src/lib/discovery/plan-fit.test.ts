import { describe, expect, it } from "vitest";

import { explainLeftOut, isOtherDay } from "./plan-fit";
import type { Recommendation } from "@/types/discovery";

function item(
  title: string,
  startsAt: string,
  endsAt: string,
  scheduleMode: "fixed" | "window" = "fixed",
): Recommendation {
  return {
    activity: { title, scheduleMode },
    date: { id: title, startsAt, endsAt, timezone: "Pacific/Auckland", isAllDay: false },
  } as unknown as Recommendation;
}

// Saturday 26 Sep 2026, Auckland is UTC+12.
const dance = item("Bollywood Dance Class", "2026-09-26T02:00:00.000Z", "2026-09-26T03:30:00.000Z");

describe("plan fit explanations", () => {
  it("flags an activity on another day than the plan", () => {
    const sunday = item("The Spongebob Musical", "2026-09-27T02:00:00.000Z", "2026-09-27T05:00:00.000Z");
    expect(isOtherDay(sunday, [dance])).toBe(true);
    expect(isOtherDay(sunday, [])).toBe(false);
    expect(explainLeftOut(sunday, [dance])).toBe(
      "The Spongebob Musical is on Sun 27 Sep, not the same day as your plan.",
    );
  });

  it("names the stop a fixed session overlaps", () => {
    const clash = item("Paint Night", "2026-09-26T03:00:00.000Z", "2026-09-26T05:00:00.000Z");
    expect(explainLeftOut(clash, [dance])).toBe(
      "Paint Night (15:00–17:00) overlaps Bollywood Dance Class (14:00–15:30).",
    );
  });

  it("falls back to travel time when nothing overlaps", () => {
    const tight = item("Recital", "2026-09-26T03:35:00.000Z", "2026-09-26T04:30:00.000Z");
    expect(explainLeftOut(tight, [dance])).toBe(
      "Recital doesn’t leave enough time to travel between your stops.",
    );
  });
});
