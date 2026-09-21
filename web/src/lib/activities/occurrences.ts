import { ACTIVITY_TIME_ZONE } from "../dates/week-range";
import { formatDayLabel, getDayKey } from "./format";
import type { Activity, ActivityDate } from "@/types/activity";

export interface Occurrence {
  activity: Activity;
  date: ActivityDate;
}

export interface OccurrenceGroup {
  key: string;
  label: string;
  occurrences: Occurrence[];
}

const hourFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  hourCycle: "h23",
  timeZone: ACTIVITY_TIME_ZONE,
});

export function isEveningStart(value: string): boolean {
  return Number(hourFormatter.format(new Date(value))) >= 17;
}

/**
 * Expands activities into one row per occurrence and groups them by local
 * day. Activities keep the order the API returned them in within a day, so a
 * distance sort survives grouping; otherwise rows are ordered by start time.
 */
export function groupByDay(
  activities: Activity[],
  options: { keepOrder?: boolean; eveningOnly?: boolean } = {},
): OccurrenceGroup[] {
  const occurrences = activities.flatMap((activity, index) =>
    activity.dates
      .filter((date) => !options.eveningOnly || isEveningStart(date.startsAt))
      .map((date) => ({ activity, date, index })),
  );
  const groups = new Map<string, OccurrenceGroup>();

  for (const occurrence of [...occurrences].sort(
    (left, right) =>
      left.date.startsAt.localeCompare(right.date.startsAt) ||
      left.index - right.index,
  )) {
    const key = getDayKey(occurrence.date.startsAt);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        label: formatDayLabel(occurrence.date.startsAt),
        occurrences: [],
      };
      groups.set(key, group);
    }
    group.occurrences.push(occurrence);
  }

  if (options.keepOrder) {
    const order = new Map(occurrences.map((item) => [item.date.id, item.index]));
    for (const group of groups.values()) {
      group.occurrences.sort(
        (left, right) =>
          (order.get(left.date.id) ?? 0) - (order.get(right.date.id) ?? 0),
      );
    }
  }

  return [...groups.values()];
}

const WEEKDAYS = [
  ["MO", "Monday"],
  ["TU", "Tuesday"],
  ["WE", "Wednesday"],
  ["TH", "Thursday"],
  ["FR", "Friday"],
  ["SA", "Saturday"],
  ["SU", "Sunday"],
] as const;

const weekdayFormatter = new Intl.DateTimeFormat("en-NZ", {
  weekday: "long",
  timeZone: ACTIVITY_TIME_ZONE,
});
const clockFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: ACTIVITY_TIME_ZONE,
});

function parseRule(rule: string | null): Map<string, string> {
  return new Map(
    (rule ?? "")
      .split(";")
      .filter(Boolean)
      .map((part) => part.split("=", 2) as [string, string]),
  );
}

/** Groups recurring activities under the weekdays they repeat on. */
export function groupByWeekday(activities: Activity[]): OccurrenceGroup[] {
  const groups = WEEKDAYS.map(([, label]) => ({
    key: label.toLowerCase(),
    label,
    occurrences: [] as Occurrence[],
  }));

  for (const activity of activities) {
    for (const date of activity.dates) {
      const byDay = parseRule(date.recurrenceRule).get("BYDAY");
      const days = byDay
        ? byDay.split(",").map((code) => code.slice(-2))
        : [];
      const indexes = days.length
        ? days
            .map((code) => WEEKDAYS.findIndex(([value]) => value === code))
            .filter((index) => index >= 0)
        : [
            WEEKDAYS.findIndex(
              ([, label]) =>
                label === weekdayFormatter.format(new Date(date.startsAt)),
            ),
          ];
      for (const index of new Set(indexes)) {
        groups[index]?.occurrences.push({ activity, date });
      }
    }
  }

  for (const group of groups) {
    group.occurrences.sort((left, right) =>
      clockFormatter
        .format(new Date(left.date.startsAt))
        .localeCompare(clockFormatter.format(new Date(right.date.startsAt))),
    );
  }

  return groups.filter((group) => group.occurrences.length > 0);
}

/** Human cadence for a recurring date, e.g. "Every two weeks". */
export function formatCadence(date: Pick<ActivityDate, "recurrenceRule">) {
  const rule = parseRule(date.recurrenceRule);
  const interval = Number(rule.get("INTERVAL") ?? "1");
  const frequency = rule.get("FREQ");
  if (frequency === "MONTHLY") return "Monthly";
  if (interval === 2) return "Every two weeks";
  if (interval > 2) return `Every ${interval} weeks`;
  return "Weekly";
}
