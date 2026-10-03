import { API_BASE_URL } from "@/lib/api/config";
import { readJson } from "@/lib/api/json";
import type { WeeklyGuide } from "@/types/weekly-guide";

/** A week's published picks, or null when none are published. */
export async function getWeeklyGuide(
  weekStart: string,
): Promise<WeeklyGuide | null> {
  const response = await fetch(
    `${API_BASE_URL}/weekly-guides/${encodeURIComponent(weekStart)}`,
    { cache: "no-store", headers: { Accept: "application/json" } },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`The weekly guides API returned ${response.status}.`);
  }
  return readJson<WeeklyGuide>(response);
}
