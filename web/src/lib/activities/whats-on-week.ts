import type { WhatsOnScope } from "./filters";
import {
  getWeekRange,
  getWeekRangeFromDate,
  getWeekSlug,
  type WeekRange,
} from "../dates/week-range";

export interface WeekTarget {
  scope: WhatsOnScope;
  week?: string;
}

/** The week a scope shows. Past weeks fall back to last week. */
export function resolveWeek(
  scope: WhatsOnScope,
  week: string | undefined,
  now: Date = new Date(),
): { range: WeekRange; slug: string } {
  if (scope === "this-week" || scope === "next-week") {
    const range = getWeekRange(scope === "this-week" ? 0 : 1, now);
    return { range, slug: getWeekSlug(range) };
  }
  const requested = week ? getWeekRangeFromDate(week) : null;
  const current = getWeekRange(0, now);
  const range =
    requested && new Date(requested.from) < new Date(current.from)
      ? requested
      : getWeekRange(-1, now);
  return { range, slug: getWeekSlug(range) };
}

/** Where the ‹ and › week arrows lead. Weeks after next are not published. */
export function getAdjacentWeeks(
  scope: WhatsOnScope,
  slug: string,
  now: Date = new Date(),
): { previous?: WeekTarget; next?: WeekTarget } {
  if (scope === "this-week") {
    return {
      previous: { scope: "past", week: getWeekSlug(getWeekRange(-1, now)) },
      next: { scope: "next-week" },
    };
  }
  if (scope === "next-week") {
    return { previous: { scope: "this-week" } };
  }
  const current = getWeekSlug(getWeekRange(0, now));
  const next = shiftWeek(slug, 1);
  return {
    previous: { scope: "past", week: shiftWeek(slug, -1) },
    next: next === current ? { scope: "this-week" } : { scope: "past", week: next },
  };
}

function shiftWeek(slug: string, weeks: number): string {
  const range = getWeekRangeFromDate(slug);
  if (!range) return slug;
  const from = new Date(range.from);
  // Noon avoids landing on the wrong day across a daylight-saving change.
  from.setUTCDate(from.getUTCDate() + weeks * 7);
  from.setUTCHours(from.getUTCHours() + 12);
  return getWeekSlug({ from: from.toISOString() });
}
