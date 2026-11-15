import type { Metadata } from "next";

import { WhatsOnExplorer } from "@/components/whats-on/whats-on-explorer";
import {
  EMPTY_FILTERS,
  parseFilters,
  parseScope,
  toSearchParams,
  type SearchParams,
} from "@/lib/activities/filters";
import { getAdjacentWeeks, resolveWeek } from "@/lib/activities/whats-on-week";
import {
  getActivities,
  getActivityFilterOptions,
  getRegularActivities,
} from "@/lib/api/activities";
import { getWeeklyGuide } from "@/lib/api/weekly-guides";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const scope = parseScope(params);
  const { tier } = parseFilters(params);
  const week = Array.isArray(params.week) ? params.week[0] : params.week;
  // Filters narrow the same listing, so only the scope, week and tier are canonical.
  const query = toSearchParams(scope, week, { ...EMPTY_FILTERS, tier }).toString();
  const canonical = query ? `/whats-on?${query}` : "/whats-on";

  return tier === "regular"
    ? {
        title: "Every week in Hamilton",
        description:
          "Library sessions, clubs, English conversation groups and classes that run every week around Hamilton.",
        alternates: { canonical },
      }
    : {
        title: "What’s on",
        description:
          "Browse this week’s highlights, weekly sessions and exhibitions around Hamilton.",
        alternates: { canonical },
      };
}

export default async function WhatsOnPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const scope = parseScope(params);
  const filters = parseFilters(params);
  const week = Array.isArray(params.week) ? params.week[0] : params.week;
  const { range, slug } = resolveWeek(scope, week);
  if (filters.when === "today" && scope !== "this-week") filters.when = undefined;
  const [initialPage, options, recurring, picks] = await Promise.all([
    getActivities(range, filters),
    getActivityFilterOptions(range),
    // Weekly-rule activities run every week, so they join the weekly sessions.
    getRegularActivities(),
    getWeeklyGuide(slug),
  ]);

  return (
    <WhatsOnExplorer
      key={`${scope}-${slug}`}
      data={{
        scope,
        week: slug,
        range,
        adjacent: getAdjacentWeeks(scope, slug),
        initialPage,
        options,
        recurring,
        pickIds: picks?.items.map((item) => item.activity.id) ?? [],
      }}
      initialFilters={filters}
    />
  );
}
