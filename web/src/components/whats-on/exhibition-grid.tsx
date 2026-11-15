import Link from "next/link";

import { activityHref } from "@/components/activities/activity-row";
import { ActivityThumb } from "@/components/activities/activity-thumb";
import { CostPill } from "@/components/activities/cost-pill";
import { formatTime, formatVenue, getCostLabel } from "@/lib/activities/format";
import { formatSessionDays } from "@/lib/activities/occurrences";
import type { Activity } from "@/types/activity";

/**
 * Exhibitions and other listings open most days, as cards that say which
 * days and hours they are open this week instead of repeating under each day.
 */
export function ExhibitionGrid({ activities }: { activities: Activity[] }) {
  return (
    <ul className="grid gap-2.5 md:grid-cols-2 md:gap-3">
      {activities.map((activity) => {
        const cost = getCostLabel(activity);
        const venue = formatVenue(activity);
        const opens = activity.dates
          .filter((date) => !date.isAllDay)
          .map((date) => formatTime(date.startsAt))
          .sort()[0];
        const hours = opens ? `from ${opens}` : "All day";
        return (
          <li key={activity.id}>
            <Link
              href={activityHref(activity.slug, activity.dates[0]?.id)}
              className="grid h-full grid-cols-[50px_minmax(0,1fr)] gap-3 rounded-[14px] border bg-card p-3 text-foreground transition-colors hover:border-[#CFCCC4] hover:text-foreground hover:no-underline focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none md:grid-cols-[58px_minmax(0,1fr)] md:p-3.5"
            >
              <ActivityThumb activity={activity} />
              <span className="flex min-w-0 flex-col justify-center gap-1">
                <span className="text-[15px] font-semibold tracking-[-0.01em] md:text-base">
                  {activity.title}
                </span>
                {venue ? (
                  <span className="truncate text-xs text-meta md:text-[13px]">{venue}</span>
                ) : null}
                <span className="flex flex-wrap items-center gap-2 text-xs text-secondary-foreground md:text-[13px]">
                  <span>
                    Open {formatSessionDays(activity.dates)} · {hours}
                  </span>
                  {cost ? <CostPill cost={cost} /> : null}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
