import { API_BASE_URL } from "@/lib/api/config";
import type {
  Activity,
  ActivityCostType,
  ActivityStatus,
  ActivityTag,
  PaginatedActivities,
  Venue,
} from "@/types/activity";

export interface ActivityDateInput {
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  isAllDay: boolean;
  recurrenceRule: string | null;
}

export interface ActivityInput {
  title: string;
  summary: string | null;
  description: string;
  imageUrl: string | null;
  costType: ActivityCostType;
  costAmountFrom: number | null;
  currency: string;
  costDetails: string | null;
  venueId: string | null;
  sourceUrl: string | null;
  dates: ActivityDateInput[];
  tagIds: string[];
}

export interface AdminActivityQuery {
  page: number;
  limit?: number;
  status?: ActivityStatus;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface AdminRequestContext {
  cookie?: string;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  context: AdminRequestContext = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init.body &&
      !(typeof FormData !== "undefined" && init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init.headers,
      ...(context.cookie ? { Cookie: context.cookie } : {}),
    },
  });

  if (!response.ok) {
    let message = `The API returned ${response.status}.`;

    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(" ");
      else if (body.message) message = body.message;
    } catch {
      // Keep the fallback when the server does not return JSON.
    }

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function getAdminActivities({
  page,
  limit = 10,
  status,
}: AdminActivityQuery, context: AdminRequestContext = {}): Promise<PaginatedActivities> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status) params.set("status", status);
  return request<PaginatedActivities>(`/admin/activities?${params}`, {}, context);
}

export function getAdminActivity(
  id: string,
  context: AdminRequestContext = {},
): Promise<Activity> {
  return request<Activity>(`/admin/activities/${id}`, {}, context);
}

export function getAdminVenues(
  context: AdminRequestContext = {},
): Promise<Venue[]> {
  return request<Venue[]>("/admin/venues", {}, context);
}

export function getAdminTags(
  context: AdminRequestContext = {},
): Promise<ActivityTag[]> {
  return request<ActivityTag[]>("/admin/tags", {}, context);
}

export interface AdminSession {
  id: string;
  email: string;
}

export interface ActivitySource {
  id: string;
  name: string;
  feedUrl: string;
  enabled: boolean;
  scheduleHours: number;
  lastRunAt: string | null;
}

export interface ImportRun {
  id: string;
  sourceId: string;
  sourceName: string;
  status: "running" | "succeeded" | "failed";
  createdCount: number;
  updatedCount: number;
  duplicateCount: number;
  reviewCount: number;
  failedCount: number;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export function loginAdmin(email: string, password: string): Promise<AdminSession> {
  return request<AdminSession>("/auth/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logoutAdmin(): Promise<void> {
  return request<void>("/auth/admin/logout", { method: "POST" });
}

export function getAdminSession(
  context: AdminRequestContext = {},
): Promise<AdminSession> {
  return request<AdminSession>("/auth/admin/session", {}, context);
}

export async function uploadAdminImage(file: File): Promise<{
  filename: string;
  url: string;
}> {
  const body = new FormData();
  body.set("file", file);
  return request("/admin/media/images", { method: "POST", body });
}

export function getAdminSources(
  context: AdminRequestContext = {},
): Promise<ActivitySource[]> {
  return request("/admin/sources", {}, context);
}

export function getAdminImportRuns(
  context: AdminRequestContext = {},
): Promise<ImportRun[]> {
  return request("/admin/imports", {}, context);
}

export function createAdminSource(input: {
  name: string;
  feedUrl: string;
  scheduleHours: number;
}): Promise<ActivitySource> {
  return request("/admin/sources", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function runAdminImport(sourceId: string): Promise<ImportRun> {
  return request(`/admin/sources/${sourceId}/import`, { method: "POST" });
}

export function createAdminActivity(input: ActivityInput): Promise<Activity> {
  return request<Activity>("/admin/activities", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminActivity(
  id: string,
  input: ActivityInput,
): Promise<Activity> {
  return request<Activity>(`/admin/activities/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function publishAdminActivity(id: string): Promise<Activity> {
  return request<Activity>(`/admin/activities/${id}/publish`, {
    method: "POST",
  });
}

export function cancelAdminActivity(id: string): Promise<Activity> {
  return request<Activity>(`/admin/activities/${id}/cancel`, {
    method: "POST",
  });
}

export function deleteAdminActivity(id: string): Promise<void> {
  return request<void>(`/admin/activities/${id}`, { method: "DELETE" });
}
