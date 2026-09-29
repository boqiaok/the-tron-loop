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

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const scope = parseScope(params);
  const week = Array.isArray(params.week) ? params.week[0] : params.week;
  // Filters narrow the same listing, so only the scope and week are canonical.
  const query = toSearchParams(scope, week, EMPTY_FILTERS).toString();
  const canonical = query ? `/whats-on?${query}` : "/whats-on";

  return scope === "regular"
    ? {
        title: "Regular weekly activities",
        description:
          "Weekly clubs, English conversation groups and classes around Hamilton.",
        alternates: { canonical },
      }
    : {
        title: "What’s on",
        description:
          "Browse this week, next week, regular and past activities around Hamilton.",
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

  if (scope === "regular") {
    const activities = await getRegularActivities();
    return (
      <WhatsOnExplorer
        key="regular"
        data={{ scope, activities }}
        initialFilters={filters}
      />
    );
  }

  const week = Array.isArray(params.week) ? params.week[0] : params.week;
  const { range, slug } = resolveWeek(scope, week);
  if (filters.when === "today" && scope !== "this-week") filters.when = undefined;
  const [initialPage, options] = await Promise.all([
    getActivities(range, filters),
    getActivityFilterOptions(range),
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
      }}
      initialFilters={filters}
    />
  );
}
