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

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
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
}: AdminActivityQuery): Promise<PaginatedActivities> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status) params.set("status", status);
  return request<PaginatedActivities>(`/admin/activities?${params}`);
}

export function getAdminActivity(id: string): Promise<Activity> {
  return request<Activity>(`/admin/activities/${id}`);
}

export function getAdminVenues(): Promise<Venue[]> {
  return request<Venue[]>("/admin/venues");
}

export function getAdminTags(): Promise<ActivityTag[]> {
  return request<ActivityTag[]>("/admin/tags");
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
