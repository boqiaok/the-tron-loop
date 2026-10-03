import type {
  Activity,
  ActivityFilterOptions,
  ActivityFilters,
  PaginatedActivities,
} from "@/types/activity";
import { API_BASE_URL } from "@/lib/api/config";
import { readJson } from "@/lib/api/json";
import { narrowRange } from "@/lib/activities/filters";

export const PAGE_SIZE = 30;

export interface ActivityRange {
  from: string;
  to: string;
}

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`The activities API returned ${response.status}.`);
  }

  return readJson<T>(response);
}

const EMPTY_PAGE = (limit: number): PaginatedActivities => ({
  items: [],
  page: 1,
  limit,
  total: 0,
  totalPages: 0,
});

/**
 * Lists activities in a week. The "When" filter narrows the date range here so
 * every caller gets the same behaviour.
 */
export function getActivities(
  range: ActivityRange,
  filters: ActivityFilters,
  options: { signal?: AbortSignal; limit?: number } = {},
): Promise<PaginatedActivities> {
  const limit = options.limit ?? PAGE_SIZE;
  const narrowed = narrowRange(range, filters.when);
  if (!narrowed) return Promise.resolve(EMPTY_PAGE(limit));

  const searchParams = new URLSearchParams({
    from: narrowed.from,
    to: narrowed.to,
    page: String(filters.page),
    limit: String(limit),
    sortBy: filters.sortBy,
  });

  if (filters.q) searchParams.set("q", filters.q);
  if (filters.includeCancelled) searchParams.set("includeCancelled", "true");
  if (filters.when === "evening") searchParams.set("evening", "true");
  if (filters.costType) searchParams.set("costType", filters.costType);
  if (filters.categories.length)
    searchParams.set("categories", filters.categories.join(","));
  if (filters.suburb) searchParams.set("suburb", filters.suburb);
  if (filters.latitude !== undefined)
    searchParams.set("latitude", String(filters.latitude));
  if (filters.longitude !== undefined)
    searchParams.set("longitude", String(filters.longitude));

  return fetchJson<PaginatedActivities>(
    `/activities?${searchParams}`,
    options.signal,
  );
}

export function getActivityFilterOptions(
  range: ActivityRange,
): Promise<ActivityFilterOptions> {
  const searchParams = new URLSearchParams({
    from: range.from,
    to: range.to,
  });

  return fetchJson<ActivityFilterOptions>(
    `/activities/filters?${searchParams}`,
  );
}

export async function getActivityCount(range: ActivityRange): Promise<number> {
  const searchParams = new URLSearchParams({
    from: range.from,
    to: range.to,
    page: "1",
    limit: "1",
    sort: "asc",
  });
  const page = await fetchJson<PaginatedActivities>(
    `/activities?${searchParams}`,
  );

  return page.total;
}

/** One public activity, or null when it does not exist or is not public. */
export async function getActivity(slug: string): Promise<Activity | null> {
  const response = await fetch(
    `${API_BASE_URL}/activities/${encodeURIComponent(slug)}`,
    { cache: "no-store", headers: { Accept: "application/json" } },
  );
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) {
    throw new Error(`The activities API returned ${response.status}.`);
  }
  return readJson<Activity>(response);
}

export function getRegularActivities(): Promise<Activity[]> {
  return fetchJson<Activity[]>("/activities/regular");
}
