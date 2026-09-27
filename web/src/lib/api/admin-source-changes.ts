import { request, type AdminRequestContext } from "@/lib/api/admin-activities";
import type { ChangedActivity } from "@/types/source-change";

export function getAdminSourceChanges(
  context: AdminRequestContext = {},
): Promise<ChangedActivity[]> {
  return request<ChangedActivity[]>("/admin/source-changes", {}, context);
}

export function acceptAdminSourceChanges(activityId: string): Promise<void> {
  return request<void>(`/admin/source-changes/${activityId}/accept`, {
    method: "POST",
  });
}
