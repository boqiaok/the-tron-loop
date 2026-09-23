import { formatDayLabel, formatTime, getDayKey } from "../activities/format";
import type { Recommendation } from "@/types/discovery";

/** When the activity really runs, before the plan fits a drop-in visit. */
function sourceTimes(item: Recommendation): { start: string; end: string } {
  const start = item.date.sourceStartsAt ?? item.date.startsAt;
  const end = item.date.sourceEndsAt ?? item.date.endsAt ?? start;
  return { start, end };
}

/** The local day a plan covers, taken from its first stop. */
export function planDayKey(stops: Recommendation[]): string | undefined {
  return stops[0] ? getDayKey(stops[0].date.startsAt) : undefined;
}

/** True when the activity is on a different day from the current plan. */
export function isOtherDay(item: Recommendation, stops: Recommendation[]): boolean {
  const day = planDayKey(stops);
  return day !== undefined && getDayKey(sourceTimes(item).start) !== day;
}

/**
 * Says why the planner left out an activity the visitor asked for: another
 * day, a clash with a planned stop, or not enough time to travel between.
 */
export function explainLeftOut(item: Recommendation, stops: Recommendation[]): string {
  const title = item.activity.title;
  const { start, end } = sourceTimes(item);
  if (isOtherDay(item, stops)) {
    return `${title} is on ${formatDayLabel(start)}, not the same day as your plan.`;
  }

  const clash = stops.find(
    (stop) =>
      item.activity.scheduleMode !== "window" &&
      stop.date.startsAt < end &&
      start < (stop.date.endsAt ?? stop.date.startsAt),
  );
  if (clash) {
    return `${title} (${formatTime(start)}–${formatTime(end)}) overlaps ${clash.activity.title} (${formatTime(clash.date.startsAt)}–${formatTime(clash.date.endsAt ?? clash.date.startsAt)}).`;
  }
  return `${title} doesn’t leave enough time to travel between your stops.`;
}
