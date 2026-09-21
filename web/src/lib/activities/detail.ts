import { getWeekRange, getWeekSlug } from "../dates/week-range";
import type { Activity, ActivityDate, Venue } from "@/types/activity";

/** The occurrence a detail page shows: the linked one, else the next upcoming. */
export function pickOccurrence(
  dates: ActivityDate[],
  dateId: string | undefined,
  now: Date = new Date(),
): ActivityDate | undefined {
  const sorted = [...dates].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return (
    sorted.find((date) => date.id === dateId) ??
    sorted.find((date) => new Date(date.endsAt ?? date.startsAt) >= now) ??
    sorted.at(-1)
  );
}

export interface BackTarget {
  href: string;
  label: string;
  shortLabel: string;
}

/** Where "Back" goes: the What’s on scope that lists this occurrence. */
export function getBackTarget(
  date: Pick<ActivityDate, "startsAt" | "recurrenceRule"> | undefined,
  now: Date = new Date(),
): BackTarget {
  if (!date) {
    return { href: "/whats-on", label: "Back to what’s on", shortLabel: "What’s on" };
  }
  if (date.recurrenceRule) {
    return {
      href: "/whats-on?scope=regular",
      label: "Back to regular activities",
      shortLabel: "Regular",
    };
  }
  const start = new Date(date.startsAt);
  const thisWeek = getWeekRange(0, now);
  const nextWeek = getWeekRange(1, now);
  if (start >= new Date(thisWeek.from) && start < new Date(thisWeek.to)) {
    return { href: "/whats-on", label: "Back to this week", shortLabel: "This week" };
  }
  if (start >= new Date(nextWeek.from) && start < new Date(nextWeek.to)) {
    return {
      href: "/whats-on?scope=next-week",
      label: "Back to next week",
      shortLabel: "Next week",
    };
  }
  if (start < new Date(thisWeek.from)) {
    const weeksAgo = Math.ceil(
      (new Date(thisWeek.from).getTime() - start.getTime()) /
        (7 * 24 * 60 * 60 * 1000),
    );
    return {
      href: `/whats-on?scope=past&week=${getWeekSlug(getWeekRange(-weeksAgo, now))}`,
      label: "Back to past weeks",
      shortLabel: "Past weeks",
    };
  }
  return { href: "/whats-on", label: "Back to what’s on", shortLabel: "What’s on" };
}

export function getMapsUrl(venue: Venue): string {
  const query =
    venue.latitude != null && venue.longitude != null
      ? `${venue.latitude},${venue.longitude}`
      : [venue.name, venue.address, venue.city].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** OpenStreetMap's embeddable view, centred on the venue with a marker. */
export function getMapEmbedUrl(latitude: number, longitude: number): string {
  const bbox = [longitude - 0.008, latitude - 0.005, longitude + 0.008, latitude + 0.005]
    .map((value) => value.toFixed(5))
    .join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
}

/** Practical facts we actually hold, in reading order. */
export function getGoodToKnow(
  activity: Pick<Activity, "environment" | "scheduleMode" | "visitMinutes">,
): string[] {
  const facts: string[] = [];
  if (activity.environment === "indoor") facts.push("Indoors");
  if (activity.environment === "outdoor") facts.push("Outdoors");
  if (activity.environment === "mixed") facts.push("Indoors and outdoors");
  if (activity.scheduleMode === "window") {
    facts.push(
      activity.visitMinutes
        ? `Drop in any time, about ${activity.visitMinutes} minutes`
        : "Drop in any time",
    );
  } else {
    facts.push("Fixed session — arrive at the start");
  }
  return facts;
}

export function getSourceHost(sourceUrl: string | null): string | null {
  if (!sourceUrl) return null;
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
