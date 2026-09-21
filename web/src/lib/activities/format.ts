import { ACTIVITY_TIME_ZONE } from "../dates/week-range";
import type { Activity } from "@/types/activity";

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: ACTIVITY_TIME_ZONE,
});

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: ACTIVITY_TIME_ZONE,
});

const datePartsFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "numeric",
  timeZone: ACTIVITY_TIME_ZONE,
});

// Fixed three-letter months: locale data varies ("Sep" vs "Sept").
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function dateParts(value: string | Date) {
  const parts = Object.fromEntries(
    datePartsFormatter
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value]),
  );
  return {
    weekday: parts.weekday,
    day: String(Number(parts.day)),
    month: MONTHS[Number(parts.month) - 1],
  };
}

/** 24-hour local time, e.g. "09:30". */
export function formatTime(value: string): string {
  return timeFormatter.format(new Date(value));
}

/** Local calendar day used for grouping, e.g. "2026-09-26". */
export function getDayKey(value: string): string {
  return dayKeyFormatter.format(new Date(value));
}

/** Day header label, e.g. "Sat 26 Sep". */
export function formatDayLabel(value: string | Date): string {
  const { weekday, day, month } = dateParts(value);
  return `${weekday} ${day} ${month}`;
}

/** Short range label, e.g. "22 – 28 Sep" or "29 Sep – 5 Oct". */
export function formatShortRange(range: { from: string; to: string }): string {
  const start = dateParts(range.from);
  const end = dateParts(new Date(new Date(range.to).getTime() - 1));
  return start.month === end.month
    ? `${start.day} – ${end.day} ${end.month}`
    : `${start.day} ${start.month} – ${end.day} ${end.month}`;
}

/** Weekend label, e.g. "Sat 26 – Sun 27 Sep". */
export function formatDayRange(range: { from: string; to: string }): string {
  const start = dateParts(range.from);
  const end = dateParts(new Date(new Date(range.to).getTime() - 1));
  if (start.day === end.day && start.month === end.month) {
    return formatDayLabel(range.from);
  }
  return start.month === end.month
    ? `${start.weekday} ${start.day} – ${end.weekday} ${end.day} ${end.month}`
    : `${start.weekday} ${start.day} ${start.month} – ${end.weekday} ${end.day} ${end.month}`;
}

export interface CostLabel {
  label: string;
  free: boolean;
}

export function getCostLabel(
  activity: Pick<Activity, "costType" | "costAmountFrom" | "currency">,
): CostLabel | null {
  if (activity.costType === "free") return { label: "Free", free: true };
  if (activity.costType === "unknown") return null;
  if (activity.costAmountFrom === null || activity.costAmountFrom <= 0)
    return { label: "Paid", free: false };

  const amount = new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: activity.currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: Number.isInteger(activity.costAmountFrom) ? 0 : 2,
  }).format(activity.costAmountFrom);

  return { label: `From ${amount}`, free: false };
}

/** Venue for the desktop meta line: "Name, Suburb". */
export function formatVenue(activity: Pick<Activity, "venue">): string | null {
  const venue = activity.venue;
  if (!venue) return null;
  return [venue.name, venue.suburb].filter(Boolean).join(", ");
}

/** Venue for tight mobile rows: the suburb when known, otherwise the name. */
export function formatVenueShort(
  activity: Pick<Activity, "venue">,
): string | null {
  return activity.venue?.suburb ?? activity.venue?.name ?? null;
}

export function formatDistance(distanceKm: number | null | undefined) {
  return distanceKm == null ? null : `${distanceKm.toFixed(1)} km`;
}

export function formatCount(count: number, noun = "activity"): string {
  const plural = noun.endsWith("y") ? `${noun.slice(0, -1)}ies` : `${noun}s`;
  return `${count} ${count === 1 ? noun : plural}`;
}
