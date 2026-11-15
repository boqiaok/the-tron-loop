import { isEveningStart } from "./occurrences";
import type { Activity } from "@/types/activity";

const LIMITED_RUN_MAX_SESSIONS = 5;

/**
 * A short label on a weekly pick saying why it stands out, from the listing
 * itself. Dates are the week's sessions, as the guide returns them.
 */
export function getPickReason(
  activity: Pick<Activity, "category" | "dates">,
): string | null {
  if (activity.category === "family") return "Good with kids";
  if (activity.category === "market") return "Market";
  const sessions = activity.dates.length;
  if (sessions === 1) {
    return isEveningStart(activity.dates[0].startsAt)
      ? "One night only"
      : "One day only";
  }
  if (sessions > 1 && sessions <= LIMITED_RUN_MAX_SESSIONS) return "Limited run";
  return null;
}
