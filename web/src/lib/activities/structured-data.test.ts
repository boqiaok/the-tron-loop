import { describe, expect, it } from "vitest";

import { getEventJsonLd } from "./structured-data";
import type { Activity, ActivityDate } from "@/types/activity";

const date: ActivityDate = {
  id: "d1",
  startsAt: "2026-10-03T21:00:00.000Z",
  endsAt: "2026-10-04T01:00:00.000Z",
  timezone: "Pacific/Auckland",
  isAllDay: false,
  recurrenceRule: null,
};

const activity = {
  title: "Night Market",
  slug: "night-market",
  summary: "Street food and stalls.",
  description: "Longer description.",
  imageUrl: null,
  costType: "free",
  costAmountFrom: null,
  currency: "NZD",
  sourceUrl: null,
  status: "published",
  venue: {
    id: "v1",
    name: "The Base",
    address: "Te Rapa Road",
    suburb: "Te Rapa",
    city: "Hamilton",
    latitude: -37.74,
    longitude: 175.23,
  },
} as Activity;

describe("getEventJsonLd", () => {
  it("describes a scheduled in-person event at its venue", () => {
    const event = getEventJsonLd(activity, date);
    expect(event).toMatchObject({
      "@type": "Event",
      url: "https://whson.com/activities/night-market",
      startDate: date.startsAt,
      endDate: date.endsAt,
      eventStatus: "https://schema.org/EventScheduled",
      location: { name: "The Base", geo: { latitude: -37.74 } },
      offers: { price: 0, priceCurrency: "NZD" },
    });
  });

  it("marks cancelled activities and omits unknown prices", () => {
    const event = getEventJsonLd(
      { ...activity, status: "cancelled", costType: "unknown" },
      date,
    );
    expect(event.eventStatus).toBe("https://schema.org/EventCancelled");
    expect(event.offers).toBeUndefined();
  });

  it("uses local calendar dates for all-day occurrences", () => {
    const event = getEventJsonLd(activity, {
      ...date,
      isAllDay: true,
      startsAt: "2026-10-03T11:00:00.000Z", // Sun 4 Oct, midnight in Hamilton
      endsAt: null,
    });
    expect(event.startDate).toBe("2026-10-04");
  });
});
