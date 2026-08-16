import type {
  ActivityFilterOptions,
  ActivityFilters,
  PaginatedActivities,
} from "@/types/activity";

export interface ActivityRange {
  from: string;
  to: string;
}

const API_BASE_URL = "http://localhost:3001/api/v1";

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
