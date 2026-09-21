import { TZDate } from "@date-fns/tz";
import { addDays, startOfDay } from "date-fns";

import { isActivityCategory } from "./category";
import { ACTIVITY_TIME_ZONE } from "../dates/week-range";
import type {
  ActivityCategory,
  ActivityFilters,
  WhenFilter,
} from "@/types/activity";

export type WhatsOnScope = "this-week" | "next-week" | "regular" | "past";

export const WHATS_ON_SCOPES: Array<{
  value: WhatsOnScope;
  label: string;
  shortLabel: string;
}> = [
  { value: "this-week", label: "This week", shortLabel: "This week" },
  { value: "next-week", label: "Next week", shortLabel: "Next week" },
  { value: "regular", label: "Regular", shortLabel: "Regular" },
  { value: "past", label: "Past weeks", shortLabel: "Past" },
];

export type SearchParams = Record<string, string | string[] | undefined>;

const WHEN_VALUES = new Set<WhenFilter>(["today", "weekend", "evening"]);

export const EMPTY_FILTERS: ActivityFilters = {
  sortBy: "date",
  includeCancelled: false,
  categories: [],
  page: 1,
};

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseScope(searchParams: SearchParams): WhatsOnScope {
  const scope = single(searchParams.scope);
  return WHATS_ON_SCOPES.some((item) => item.value === scope)
    ? (scope as WhatsOnScope)
    : "this-week";
}

/** Reads the shareable filter state from the URL. Location is never stored. */
export function parseFilters(searchParams: SearchParams): ActivityFilters {
  const q = single(searchParams.q)?.trim();
  const cost = single(searchParams.cost);
  const when = single(searchParams.when);
  const suburb = single(searchParams.suburb)?.trim();
  const categories = (single(searchParams.category) ?? "")
    .split(",")
    .filter(isActivityCategory);

  return {
    q: q && q.length <= 100 ? q : undefined,
    sortBy: "date",
    includeCancelled: single(searchParams.cancelled) === "show",
    costType: cost === "free" || cost === "paid" ? cost : undefined,
    categories: [...new Set<ActivityCategory>(categories)],
    when: WHEN_VALUES.has(when as WhenFilter) ? (when as WhenFilter) : undefined,
    suburb: suburb && suburb.length <= 120 ? suburb : undefined,
    page: 1,
  };
}

export function toSearchParams(
  scope: WhatsOnScope,
  week: string | undefined,
  filters: ActivityFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  if (scope !== "this-week") params.set("scope", scope);
  if (scope === "past" && week) params.set("week", week);
  if (filters.q) params.set("q", filters.q);
  if (filters.categories.length)
    params.set("category", filters.categories.join(","));
  if (filters.costType) params.set("cost", filters.costType);
  if (filters.when) params.set("when", filters.when);
  if (filters.suburb) params.set("suburb", filters.suburb);
  if (filters.includeCancelled) params.set("cancelled", "show");
  return params;
}

export function countActiveFilters(filters: ActivityFilters): number {
  return (
    filters.categories.length +
    (filters.costType ? 1 : 0) +
    (filters.when ? 1 : 0) +
    (filters.suburb ? 1 : 0)
  );
}

/**
 * Narrows a week to the "When" choice. Returns null when the choice falls
 * entirely outside the week (for example "Today" on next week).
 */
export function narrowRange(
  range: { from: string; to: string },
  when: WhenFilter | undefined,
  now: Date = new Date(),
): { from: string; to: string } | null {
  if (when === "today") {
    const today = startOfDay(new TZDate(now, ACTIVITY_TIME_ZONE));
    const from = today.toISOString();
    const to = addDays(today, 1).toISOString();
    return new Date(from) >= new Date(range.from) &&
      new Date(to) <= new Date(range.to)
      ? { from, to }
      : null;
  }
  if (when === "weekend") {
    const weekStart = new TZDate(range.from, ACTIVITY_TIME_ZONE);
    return { from: addDays(weekStart, 5).toISOString(), to: range.to };
  }
  return range;
}
