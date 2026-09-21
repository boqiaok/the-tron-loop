import { describe, expect, it } from "vitest";

import { buildActivityIcs } from "./ics";

describe("buildActivityIcs", () => {
  it("writes one escaped UTC event", () => {
    const ics = buildActivityIcs(
      {
        title: "Science Saturday; Build a Bot",
        summary: "Build, then take it home",
        venue: {
          id: "v",
          name: "Waikato Museum",
          address: "1 Grantham St",
          suburb: null,
          city: "Hamilton",
          latitude: null,
          longitude: null,
        },
        sourceUrl: "https://example.com/bot",
      },
      {
        id: "date-1",
        startsAt: "2026-09-26T01:00:00.000Z",
        endsAt: "2026-09-26T04:00:00.000Z",
        isAllDay: false,
      },
      new Date("2026-09-20T00:00:00Z"),
    );

    expect(ics).toContain("DTSTART:20260926T010000Z\r\n");
    expect(ics).toContain("DTEND:20260926T040000Z\r\n");
    expect(ics).toContain("SUMMARY:Science Saturday\; Build a Bot\r\n");
    expect(ics).toContain(
      "LOCATION:Waikato Museum\\, 1 Grantham St\\, Hamilton\r\n",
    );
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  });
});
