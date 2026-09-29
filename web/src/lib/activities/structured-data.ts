import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

import { SITE_URL } from "../site";
import type { Activity, ActivityDate } from "@/types/activity";

/**
 * schema.org Event for one occurrence, so search engines can show the
 * activity as an event result.
 * https://developers.google.com/search/docs/appearance/structured-data/event
 */
export function getEventJsonLd(activity: Activity, date: ActivityDate) {
  const venue = activity.venue;
  const moment = (value: string) =>
    date.isAllDay
      ? format(new TZDate(value, date.timezone), "yyyy-MM-dd")
      : value;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: activity.title,
    description: activity.summary ?? activity.description,
    url: `${SITE_URL}/activities/${activity.slug}`,
    image: activity.imageUrl ? [activity.imageUrl] : undefined,
    startDate: moment(date.startsAt),
    endDate: date.endsAt ? moment(date.endsAt) : undefined,
    eventStatus:
      activity.status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: venue
      ? {
          "@type": "Place",
          name: venue.name,
          address: {
            "@type": "PostalAddress",
            streetAddress: venue.address ?? undefined,
            addressLocality: venue.city,
            addressCountry: "NZ",
          },
          geo:
            venue.latitude != null && venue.longitude != null
              ? {
                  "@type": "GeoCoordinates",
                  latitude: venue.latitude,
                  longitude: venue.longitude,
                }
              : undefined,
        }
      : undefined,
    offers: getOffer(activity),
  };
}

function getOffer(activity: Activity) {
  const price =
    activity.costType === "free"
      ? 0
      : activity.costType === "paid"
        ? activity.costAmountFrom
        : null;
  if (price == null) return undefined;
  return {
    "@type": "Offer",
    price,
    priceCurrency: activity.currency,
    url: activity.sourceUrl ?? undefined,
  };
}
