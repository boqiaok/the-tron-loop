import type { Activity, ActivityDate } from "@/types/activity";

/** One-event iCalendar file for a single occurrence (RFC 5545). */
export function buildActivityIcs(
  activity: Pick<Activity, "title" | "summary" | "venue" | "sourceUrl">,
  date: Pick<ActivityDate, "id" | "startsAt" | "endsAt" | "isAllDay">,
  now: Date = new Date(),
): string {
  const start = new Date(date.startsAt);
  const end = date.endsAt
    ? new Date(date.endsAt)
    : new Date(start.getTime() + 60 * 60 * 1000);
  const location = activity.venue
    ? [activity.venue.name, activity.venue.address, activity.venue.city]
        .filter(Boolean)
        .join(", ")
    : null;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Tron Loop//Activity//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${date.id}@thetronloop`,
    `DTSTAMP:${utcStamp(now)}`,
    ...(date.isAllDay
      ? [`DTSTART;VALUE=DATE:${utcStamp(start).slice(0, 8)}`]
      : [`DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(end)}`]),
    `SUMMARY:${escapeText(activity.title)}`,
    ...(location ? [`LOCATION:${escapeText(location)}`] : []),
    ...(activity.summary ? [`DESCRIPTION:${escapeText(activity.summary)}`] : []),
    ...(activity.sourceUrl ? [`URL:${activity.sourceUrl}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

function utcStamp(value: Date): string {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 characters continue on the next line after a space. */
function fold(line: string): string {
  const parts: string[] = [];
  for (let index = 0; index < line.length; index += 74) {
    parts.push(line.slice(index, index + 74));
  }
  return parts.join("\r\n ");
}
