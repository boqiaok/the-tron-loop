import { TZDate } from "@date-fns/tz";

import { formatTime } from "./format";
import {
  getRecurringWeekdays,
  isEveningStart,
  seriesKey,
} from "./occurrences";
import { ACTIVITY_TIME_ZONE } from "../dates/week-range";
import type { Activity, ActivityDate, ActivityFilters } from "@/types/activity";

/**
 * The Every week tab: each session that comes back weekly is one row, with
 * the branches and times it runs at this week, grouped by who it is for.
 */

const SHORT_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface WeeklySession {
  activity: Activity;
  date: ActivityDate;
  /** "Tue 10:30", or "Tue, Thu 14:00" for a weekly rule. */
  label: string;
  /** The venue without its te reo or long suffix, e.g. "Glenview Library". */
  place: string | null;
  sortKey: string;
}

export interface WeeklySeries {
  key: string;
  activity: Activity;
  sessions: WeeklySession[];
  venues: number;
  /** Set for activities with a weekly rule, e.g. "Every two weeks". */
  recurring: boolean;
}

export interface WeeklyGroup {
  key: "family" | "everyone";
  label: string;
  series: WeeklySeries[];
}

const weekdayFormatter = new Intl.DateTimeFormat("en-NZ", {
  weekday: "short",
  timeZone: ACTIVITY_TIME_ZONE,
});

function weekdayIndex(value: string): number {
  return SHORT_WEEKDAYS.indexOf(weekdayFormatter.format(new Date(value)));
}

function shortPlace(activity: Activity): string | null {
  return activity.venue?.name.split(" - ")[0].trim() || null;
}

function sessionsOf(activity: Activity): WeeklySession[] {
  return activity.dates.map((date) => {
    const time = date.isAllDay ? "All day" : formatTime(date.startsAt);
    if (date.recurrenceRule) {
      const days = getRecurringWeekdays(date);
      return {
        activity,
        date,
        label: `${days.map((day) => SHORT_WEEKDAYS[day]).join(", ")} ${time}`,
        place: shortPlace(activity),
        sortKey: `${days[0] ?? 0}${time}`,
      };
    }
    const day = weekdayIndex(date.startsAt);
    return {
      activity,
      date,
      label: `${SHORT_WEEKDAYS[day]} ${time}`,
      place: shortPlace(activity),
      sortKey: `${day}${time}`,
    };
  });
}

/** Folds dated sessions and weekly-rule activities into rows by audience. */
export function groupWeeklySessions(
  dated: Activity[],
  recurring: Activity[],
): WeeklyGroup[] {
  const seriesByKey = new Map<string, WeeklySeries>();
  for (const activity of [...dated, ...recurring]) {
    const sessions = sessionsOf(activity);
    if (!sessions.length) continue;
    const key = seriesKey(activity);
    const series = seriesByKey.get(key) ?? {
      key,
      activity,
      sessions: [],
      venues: 0,
      recurring: false,
    };
    series.sessions.push(...sessions);
    series.recurring ||= sessions.some((session) => session.date.recurrenceRule);
    seriesByKey.set(key, series);
  }

  const groups: WeeklyGroup[] = [
    { key: "family", label: "Children and families", series: [] },
    { key: "everyone", label: "Adults and everyone", series: [] },
  ];
  for (const series of seriesByKey.values()) {
    series.sessions.sort((left, right) =>
      left.sortKey.localeCompare(right.sortKey),
    );
    series.activity = series.sessions[0].activity;
    series.venues = new Set(
      series.sessions.map(
        (session) => session.activity.venue?.id ?? session.activity.id,
      ),
    ).size;
    groups[series.activity.category === "family" ? 0 : 1].series.push(series);
  }
  for (const group of groups) {
    group.series.sort(
      (left, right) =>
        left.sessions[0].sortKey.localeCompare(right.sessions[0].sortKey) ||
        left.activity.title.localeCompare(right.activity.title),
    );
  }
  return groups.filter((group) => group.series.length > 0);
}

/**
 * Applies the listing filters to weekly-rule activities, which are loaded
 * whole rather than queried per week.
 */
export function filterRecurring(
  activities: Activity[],
  filters: ActivityFilters,
  now: Date = new Date(),
): Activity[] {
  const query = filters.q?.toLowerCase();
  const suburb = filters.suburb?.toLowerCase();
  const today = (new TZDate(now, ACTIVITY_TIME_ZONE).getDay() + 6) % 7;

  return activities.filter((activity) => {
    if (filters.costType && activity.costType !== filters.costType) return false;
    if (
      filters.categories.length &&
      !filters.categories.includes(activity.category)
    ) {
      return false;
    }
    if (suburb && activity.venue?.suburb?.toLowerCase() !== suburb) return false;
    if (
      query &&
      ![
        activity.title,
        activity.summary,
        activity.description,
        activity.venue?.name,
        activity.venue?.suburb,
        ...activity.tags.map((tag) => tag.name),
      ].some((value) => value?.toLowerCase().includes(query))
    ) {
      return false;
    }
    return activity.dates.some((date) => {
      if (filters.when === "evening") return isEveningStart(date.startsAt);
      const days = getRecurringWeekdays(date);
      if (filters.when === "weekend") return days.some((day) => day >= 5);
      if (filters.when === "today") return days.includes(today);
      return true;
    });
  });
}
