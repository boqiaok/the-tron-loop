import type { ActivityStatus } from "@/types/activity";

export type AdminActivityTiming = "upcoming" | "past" | "all";
export type AdminActivitySchedule = "all" | "single" | "series";
export type AdminActivitySort =
  | "created-desc"
  | "created-asc"
  | "updated-desc"
  | "starts-asc"
  | "starts-desc";

export interface AdminActivityListQuery {
  page: number;
  status?: ActivityStatus;
  /** A source ID, or "manual" for administrator-created activities. */
  source?: string;
  q?: string;
  timing: AdminActivityTiming;
  schedule: AdminActivitySchedule;
  sort: AdminActivitySort;
}

export const ADMIN_ACTIVITY_SORT_OPTIONS: Array<{
  value: AdminActivitySort;
  label: string;
}> = [
  { value: "starts-asc", label: "Starts soonest" },
  { value: "starts-desc", label: "Starts latest" },
  { value: "created-desc", label: "Newest added" },
  { value: "created-asc", label: "Oldest added" },
  { value: "updated-desc", label: "Recently updated" },
];

export const ADMIN_ACTIVITY_TIMING_OPTIONS: Array<{
  value: AdminActivityTiming;
  label: string;
}> = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "all", label: "All dates" },
];

export const ADMIN_ACTIVITY_SCHEDULE_OPTIONS: Array<{
  value: AdminActivitySchedule;
  label: string;
}> = [
  { value: "all", label: "All schedules" },
  { value: "single", label: "Single & short runs" },
  { value: "series", label: "Series (4+ dates)" },
];

const DEFAULT_TIMING: AdminActivityTiming = "upcoming";
const DEFAULT_SCHEDULE: AdminActivitySchedule = "all";
const DEFAULT_SORT: AdminActivitySort = "starts-asc";
const STATUSES = new Set<string>([
  "draft",
  "published",
  "cancelled",
  "rejected",
]);
const TIMINGS = new Set<string>(
  ADMIN_ACTIVITY_TIMING_OPTIONS.map(({ value }) => value),
);
const SCHEDULES = new Set<string>(
  ADMIN_ACTIVITY_SCHEDULE_OPTIONS.map(({ value }) => value),
);
const SORTS = new Set<string>(
  ADMIN_ACTIVITY_SORT_OPTIONS.map(({ value }) => value),
);

type RawSearchParams = Record<string, string | string[] | undefined>;

export function parseAdminActivityListQuery(
  raw: RawSearchParams,
): AdminActivityListQuery {
  const status = getSingle(raw.status);
  const timing = getSingle(raw.timing);
  const schedule = getSingle(raw.schedule);
  const sort = getSingle(raw.sort);
  const page = Number(getSingle(raw.page) ?? "1");

  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    status: status && STATUSES.has(status) ? (status as ActivityStatus) : undefined,
    source: getSingle(raw.source) || undefined,
    q: getSingle(raw.q)?.trim().slice(0, 100) || undefined,
    timing:
      timing && TIMINGS.has(timing) ? (timing as AdminActivityTiming) : DEFAULT_TIMING,
    schedule:
      schedule && SCHEDULES.has(schedule)
        ? (schedule as AdminActivitySchedule)
        : DEFAULT_SCHEDULE,
    sort: sort && SORTS.has(sort) ? (sort as AdminActivitySort) : DEFAULT_SORT,
  };
}

/** Builds the admin list URL, leaving defaults out so links stay short. */
export function makeAdminActivityListHref(
  query: AdminActivityListQuery,
  changes: Partial<AdminActivityListQuery> = {},
): string {
  const next = { ...query, page: 1, ...changes };
  const params = new URLSearchParams();
  if (next.status) params.set("status", next.status);
  if (next.source) params.set("source", next.source);
  if (next.q) params.set("q", next.q);
  if (next.timing !== DEFAULT_TIMING) params.set("timing", next.timing);
  if (next.schedule !== DEFAULT_SCHEDULE) params.set("schedule", next.schedule);
  if (next.sort !== DEFAULT_SORT) params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));
  const search = params.toString();
  return search ? `/admin/activities?${search}` : "/admin/activities";
}

/** Converts the page query into the admin API's query parameters. */
export function toAdminActivityApiParams(
  query: AdminActivityListQuery,
  limit: number,
): URLSearchParams {
  const [sortBy, order] = {
    "created-desc": ["created", "desc"],
    "created-asc": ["created", "asc"],
    "updated-desc": ["updated", "desc"],
    "starts-asc": ["startsAt", "asc"],
    "starts-desc": ["startsAt", "desc"],
  }[query.sort];
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(limit),
    sortBy,
    order,
  });
  if (query.status) params.set("status", query.status);
  if (query.source) params.set("source", query.source);
  if (query.q) params.set("q", query.q);
  if (query.timing !== "all") params.set("timing", query.timing);
  if (query.schedule !== "all") params.set("schedule", query.schedule);
  return params;
}

function getSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
