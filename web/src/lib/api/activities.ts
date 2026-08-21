import type {
  ActivityFilterOptions,
  ActivityFilters,
  PaginatedActivities,
} from "@/types/activity";
import { API_BASE_URL } from "@/lib/api/config";

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

  return (await response.json()) as T;
}

export function getActivities(
  range: ActivityRange,
  filters: ActivityFilters,
  signal?: AbortSignal,
): Promise<PaginatedActivities> {
  const searchParams = new URLSearchParams({
    from: range.from,
    to: range.to,
    page: String(filters.page),
    limit: "12",
    sort: filters.sort,
  });

  if (filters.q) searchParams.set("q", filters.q);
  if (filters.status) searchParams.set("status", filters.status);
  if (filters.costType) searchParams.set("costType", filters.costType);
  if (filters.tag) searchParams.set("tag", filters.tag);
  if (filters.suburb) searchParams.set("suburb", filters.suburb);

  return fetchJson<PaginatedActivities>(`/activities?${searchParams}`, signal);
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

export async function getActivityCount(
  range: ActivityRange,
): Promise<number> {
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
