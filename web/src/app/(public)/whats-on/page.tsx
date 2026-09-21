import type { Metadata } from "next";

import { WhatsOnExplorer } from "@/components/whats-on/whats-on-explorer";
import {
  parseFilters,
  parseScope,
  type SearchParams,
} from "@/lib/activities/filters";
import { getAdjacentWeeks, resolveWeek } from "@/lib/activities/whats-on-week";
import {
  getActivities,
  getActivityFilterOptions,
  getRegularActivities,
} from "@/lib/api/activities";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "What’s on",
  description:
    "Browse this week, next week, regular and past activities around Hamilton.",
};

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
