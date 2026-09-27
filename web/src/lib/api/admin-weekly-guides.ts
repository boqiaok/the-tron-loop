import { request, type AdminRequestContext } from "@/lib/api/admin-activities";
import type {
  AdminWeeklyGuide,
  WeeklyGuide,
  WeeklyGuideInput,
} from "@/types/weekly-guide";

export function getAdminWeeklyGuide(
  weekStart: string,
  context: AdminRequestContext = {},
): Promise<AdminWeeklyGuide> {
  return request<AdminWeeklyGuide>(
    `/admin/weekly-guides/${weekStart}`,
    {},
    context,
  );
}

export function saveAdminWeeklyGuide(
  weekStart: string,
  input: WeeklyGuideInput,
): Promise<WeeklyGuide> {
  return request<WeeklyGuide>(`/admin/weekly-guides/${weekStart}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function publishAdminWeeklyGuide(
  weekStart: string,
): Promise<WeeklyGuide> {
  return request<WeeklyGuide>(`/admin/weekly-guides/${weekStart}/publish`, {
    method: "POST",
  });
}
