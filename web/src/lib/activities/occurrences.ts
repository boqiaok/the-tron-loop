import { ACTIVITY_TIME_ZONE } from "../dates/week-range";
import { formatDayLabel, formatDayRange, formatTime, getDayKey } from "./format";
import type { Activity, ActivityDate } from "@/types/activity";

export interface Occurrence {
  activity: Activity;
  /** The first session this row stands for; the row links to it. */
  date: ActivityDate;
  /** Every session folded into this row, in time order. */
  sessions?: ActivityDate[];
  /** Distinct days the activity runs on, set for ongoing rows. */
  ongoingDays?: number;
}

/**
 * Activities on at least this many days of the listed range (exhibitions,
 * competitions, festival weeks) are listed once as ongoing, not every day.
 */
export const ONGOING_MIN_DAYS = 4;
export const ONGOING_GROUP_KEY = "ongoing";

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
 * Groups activities by local day with one row per activity per day; several
 * sessions on one day fold into that row. Activities running on
 * ONGOING_MIN_DAYS or more days lead the list once, as an "Ongoing" group.
 * Activities keep the order the API returned them in within a group, so a
 * distance sort survives grouping; otherwise rows are ordered by start time.
 */
export function groupByDay(
  activities: Activity[],
  options: { keepOrder?: boolean; eveningOnly?: boolean } = {},
): OccurrenceGroup[] {
  type Row = { occurrence: Occurrence; index: number };
  const ongoing: Row[] = [];
  const rows: Row[] = [];

  activities.forEach((activity, index) => {
    const dates = activity.dates
      .filter((date) => !options.eveningOnly || isEveningStart(date.startsAt))
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
    const byDay = new Map<string, ActivityDate[]>();
    for (const date of dates) {
      const key = getDayKey(date.startsAt);
      byDay.set(key, [...(byDay.get(key) ?? []), date]);
    }

    if (byDay.size >= ONGOING_MIN_DAYS) {
      ongoing.push({
        occurrence: {
          activity,
          date: dates[0],
          sessions: dates,
          ongoingDays: byDay.size,
        },
        index,
      });
      return;
    }
    for (const sessions of byDay.values()) {
      rows.push({ occurrence: { activity, date: sessions[0], sessions }, index });
    }
  });

  const byOrder = (left: Row, right: Row) =>
    options.keepOrder
      ? left.index - right.index
      : left.occurrence.date.startsAt.localeCompare(
          right.occurrence.date.startsAt,
        ) || left.index - right.index;
  const groups = new Map<string, OccurrenceGroup>();
  for (const { occurrence } of [...rows].sort(byOrder)) {
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

  const dayGroups = [...groups.values()].sort((left, right) =>
    left.key.localeCompare(right.key),
  );
  return ongoing.length
    ? [
        {
          key: ONGOING_GROUP_KEY,
          label: "Ongoing",
          occurrences: ongoing.sort(byOrder).map((row) => row.occurrence),
        },
        ...dayGroups,
      ]
    : dayGroups;
}

/** "Sat 26 – Sun 27 Sep" for the days an ongoing row covers. */
export function formatSessionSpan(sessions: ActivityDate[]): string {
  const last = sessions[sessions.length - 1];
  return formatDayRange({
    from: sessions[0].startsAt,
    to: new Date(new Date(last.startsAt).getTime() + 1).toISOString(),
  });
}

/** Start times of the sessions, e.g. "18:00 · 18:30 · 19:00 +2". */
export function formatSessionTimes(sessions: ActivityDate[], max = 3): string {
  const times = [
    ...new Set(
      sessions.filter((date) => !date.isAllDay).map((date) => formatTime(date.startsAt)),
    ),
  ].sort();
  const shown = times.slice(0, max).join(" · ");
  return times.length > max ? `${shown} +${times.length - max}` : shown;
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
