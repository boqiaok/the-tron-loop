import type { MetadataRoute } from "next";

import { EMPTY_FILTERS } from "@/lib/activities/filters";
import {
  getActivities,
  getRegularActivities,
  type ActivityRange,
} from "@/lib/api/activities";
import { getWeekRange } from "@/lib/dates/week-range";
import { SITE_URL } from "@/lib/site";
import type { Activity } from "@/types/activity";

export const dynamic = "force-dynamic";

/** Weeks of dated activities listed, starting with the current one. */
const HORIZON_WEEKS = 8;
const API_PAGE_LIMIT = 100;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const weeks = Array.from({ length: HORIZON_WEEKS }, (_, offset) =>
    getWeekActivities(getWeekRange(offset)),
  );
  const lists = await Promise.all([...weeks, getRegularActivities()]);

  const activities = new Map<string, Activity>();
  for (const activity of lists.flat()) {
    activities.set(activity.slug, activity);
  }

  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/whats-on`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/about`, changeFrequency: "yearly", priority: 0.3 },
    ...[...activities.values()].map((activity) => ({
      url: `${SITE_URL}/activities/${activity.slug}`,
      lastModified: activity.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}

/** The public API only lists one week per query. */
async function getWeekActivities(range: ActivityRange): Promise<Activity[]> {
  const items: Activity[] = [];
  for (let page = 1; ; page++) {
    const result = await getActivities(
      range,
      { ...EMPTY_FILTERS, page },
      { limit: API_PAGE_LIMIT },
    );
    items.push(...result.items);
    if (page >= result.totalPages) return items;
  }
}
