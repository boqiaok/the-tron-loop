import { TZDate } from "@date-fns/tz";
import { addWeeks, startOfWeek } from "date-fns";

export const ACTIVITY_TIME_ZONE = "Pacific/Auckland";

export interface WeekRange {
  from: string;
  to: string;
  label: string;
}

export function getWeekRange(
  weekOffset: number,
  now: Date = new Date(),
): WeekRange {
  const zonedNow = new TZDate(now, ACTIVITY_TIME_ZONE);
  const currentWeekStart = startOfWeek(zonedNow, { weekStartsOn: 1 });
  const from = addWeeks(currentWeekStart, weekOffset);
  const to = addWeeks(from, 1);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    label: formatWeekLabel(from, to),
  };
}

function formatWeekLabel(from: Date, to: Date): string {
  const lastMoment = new Date(to.getTime() - 1);
  const startFormatter = new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "long",
    timeZone: ACTIVITY_TIME_ZONE,
  });
  const endFormatter = new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: ACTIVITY_TIME_ZONE,
  });

  return `${startFormatter.format(from)} – ${endFormatter.format(lastMoment)}`;
}

export function formatActivityDate(
  startsAt: string,
  endsAt: string | null,
  isAllDay: boolean,
): string {
  const start = new Date(startsAt);
  const dateFormatter = new Intl.DateTimeFormat("en-NZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: ACTIVITY_TIME_ZONE,
  });

  if (isAllDay) {
    return `${dateFormatter.format(start)} · All day`;
  }

  const timeFormatter = new Intl.DateTimeFormat("en-NZ", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: ACTIVITY_TIME_ZONE,
  });
  const startLabel = `${dateFormatter.format(start)} · ${timeFormatter.format(start)}`;

  if (!endsAt) {
    return startLabel;
  }

  const end = new Date(endsAt);
  const sameDayFormatter = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: ACTIVITY_TIME_ZONE,
  });

  if (sameDayFormatter.format(start) === sameDayFormatter.format(end)) {
    return `${startLabel}–${timeFormatter.format(end)}`;
  }

  return `${startLabel} – ${dateFormatter.format(end)} · ${timeFormatter.format(end)}`;
}
