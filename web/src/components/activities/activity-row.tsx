import Link from "next/link";

import { ActivityThumb } from "@/components/activities/activity-thumb";
import { CategoryLabel } from "@/components/activities/category-label";
import { CostPill } from "@/components/activities/cost-pill";
import {
  formatDistance,
  formatTime,
  formatVenue,
  formatVenueShort,
  getCostLabel,
} from "@/lib/activities/format";
import {
  formatCadence,
  formatSessionSpan,
  formatSessionTimes,
  type Occurrence,
} from "@/lib/activities/occurrences";
import { cn } from "@/lib/utils";

/**
 * The list unit: time, a thumbnail that fills the row height, then title,
 * one-line summary and meta line. Mobile folds the cost into the meta line.
 * Opens the detail page.
 */
export function ActivityRow({
  occurrence,
  recurring = false,
}: {
  occurrence: Occurrence;
  recurring?: boolean;
}) {
  const { activity, date, ongoingDays } = occurrence;
  const sessions = occurrence.sessions ?? [date];
  const time = describeTime(occurrence);
  const sessionMeta = ongoingDays
    ? formatSessionSpan(sessions)
    : sessions.length > 1
      ? formatSessionTimes(sessions)
      : null;
  const cancelled = activity.status === "cancelled";
  const cost = getCostLabel(activity);
  const venue = formatVenue(activity);
  const venueShort = formatVenueShort(activity);
  const distance = formatDistance(activity.distanceKm);
  const summary = activity.summary ?? activity.description;
  const visit =
    activity.scheduleMode === "window" && activity.visitMinutes
      ? `Drop in · ~${activity.visitMinutes} min visit`
      : null;

  return (
    <Link
      href={activityHref(activity.slug, date.id)}
      className={cn(
        "grid w-full grid-cols-[50px_minmax(0,1fr)] items-stretch gap-2.5 rounded-[12px] border bg-card px-3 py-[9px] text-left text-foreground transition-colors hover:border-[#CFCCC4] hover:text-foreground hover:no-underline focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none md:grid-cols-[62px_minmax(0,1fr)_auto] md:gap-3.5 md:px-3.5 md:py-2.5",
        cancelled && "bg-sunken opacity-70",
      )}
    >
      <span className="flex flex-col">
        <span
          className={cn(
            "text-sm font-semibold md:text-[15px]",
            cancelled && "text-muted-foreground line-through",
          )}
        >
          {time.primary}
        </span>
        {time.secondary ? (
          <span
            className={cn(
              "text-xs text-muted-foreground md:text-[13px]",
              cancelled && "text-[#A8ABB1]",
            )}
          >
            {time.secondary}
          </span>
        ) : null}
      </span>

      <span className="flex min-w-0 items-stretch gap-2.5 md:gap-3">
        <ActivityThumb activity={activity} />
        <span className="flex min-w-0 flex-col justify-center gap-0.5 md:gap-[3px]">
          <span
            className={cn(
              "text-[15px] font-semibold tracking-[-0.01em] md:text-[17px]",
              cancelled && "text-muted-foreground line-through",
            )}
          >
            {activity.title}
          </span>
          {summary ? (
            <span className="line-clamp-2 text-xs leading-[1.45] text-body md:line-clamp-none md:truncate md:text-[13px]">
              {summary}
            </span>
          ) : null}

          {cancelled ? (
            <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:text-[13px]">
              {venueShort ? <span>{venueShort}</span> : null}
              <span className="rounded-full bg-cancelled px-2 py-0.5 text-[11px] font-semibold text-cancelled-foreground md:hidden">
                Cancelled
              </span>
            </span>
          ) : (
            <>
              {/* Desktop meta line */}
              <span className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-meta md:flex">
                <CategoryLabel category={activity.category} />
                {venue ? <span>{venue}</span> : null}
                {sessionMeta ? <span>{sessionMeta}</span> : null}
                {distance ? <span>{distance}</span> : null}
                {recurring ? <span>{formatCadence(date)}</span> : null}
                {visit ? <span>{visit}</span> : null}
              </span>
              {/* Mobile meta line, cost folded in */}
              <span className="flex min-w-0 items-center gap-2 text-xs text-meta md:hidden">
                <CategoryLabel category={activity.category} short />
                {venueShort ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{venueShort}</span>
                  </>
                ) : null}
                {distance ? <span className="shrink-0">{distance}</span> : null}
                {cost ? (
                  <span
                    className={cn(
                      "shrink-0 font-semibold",
                      cost.free
                        ? "text-free-foreground"
                        : "text-secondary-foreground",
                    )}
                  >
                    {cost.label}
                  </span>
                ) : null}
              </span>
            </>
          )}
        </span>
      </span>

      <span className="hidden shrink-0 items-center gap-3.5 md:flex">
        {cancelled ? (
          <span className="rounded-full bg-cancelled px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-cancelled-foreground">
            Cancelled
          </span>
        ) : (
          <>
            {cost ? <CostPill cost={cost} /> : null}
            <span aria-hidden="true" className="text-lg text-[#7C8087]">
              ›
            </span>
          </>
        )}
      </span>
    </Link>
  );
}

/**
 * The time column: an ongoing row gives how often it runs, a row folding
 * several sessions gives the first start and how many more follow.
 */
function describeTime({ date, sessions = [date], ongoingDays }: Occurrence): {
  primary: string;
  secondary: string | null;
} {
  if (ongoingDays) {
    const times = new Set(
      sessions.map((session) => (session.isAllDay ? "All day" : formatTime(session.startsAt))),
    );
    return {
      primary: ongoingDays >= 7 ? "Daily" : `${ongoingDays} days`,
      secondary: times.size === 1 ? [...times][0] : "Various",
    };
  }
  if (date.isAllDay) return { primary: "All day", secondary: null };
  if (sessions.length > 1) {
    return {
      primary: formatTime(date.startsAt),
      secondary: `+${sessions.length - 1} more`,
    };
  }
  return {
    primary: formatTime(date.startsAt),
    secondary: date.endsAt ? formatTime(date.endsAt) : null,
  };
}

export function activityHref(slug: string, dateId?: string): string {
  return dateId
    ? `/activities/${slug}?date=${encodeURIComponent(dateId)}`
    : `/activities/${slug}`;
}
