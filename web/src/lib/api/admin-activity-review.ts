import { request, type AdminRequestContext } from "@/lib/api/admin-activities";
import type { ActivityReview } from "@/types/activity-review";

export function getAdminActivityReview(
  context: AdminRequestContext = {},
): Promise<ActivityReview> {
  return request<ActivityReview>("/admin/activity-review", {}, context);
}
