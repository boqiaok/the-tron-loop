import Link from "next/link";

import { activityHref } from "@/components/activities/activity-row";
import { ActivityThumb } from "@/components/activities/activity-thumb";
import { CategoryLabel } from "@/components/activities/category-label";
import { CostPill } from "@/components/activities/cost-pill";
import { formatCount, getCostLabel } from "@/lib/activities/format";
import { formatCadence } from "@/lib/activities/occurrences";
import type { WeeklyGroup, WeeklySeries } from "@/lib/activities/weekly-sessions";

/**
 * One row per weekly session; its times this week link straight to that
 * session, so a parent can pick the branch and day that suit them.
 */
export function WeeklySessionsList({ groups }: { groups: WeeklyGroup[] }) {
  return (
    <div className="flex flex-col gap-2 md:gap-1.5">
      {groups.map((group, index) => (
        <section
          key={group.key}
          aria-labelledby={`weekly-${group.key}`}
          className="flex flex-col gap-2 md:gap-1.5"
        >
          <h3
            id={`weekly-${group.key}`}
            className={
              index === 0
                ? "flex items-baseline gap-2 px-0.5 pb-1 md:gap-2.5 md:pt-2"
                : "flex items-baseline gap-2 px-0.5 pt-1.5 pb-1 md:gap-2.5 md:pt-3.5"
            }
          >
            <span className="text-xs font-bold tracking-[0.08em] uppercase md:text-[13px]">
              {group.label}
            </span>
            <span className="text-xs text-muted-foreground md:text-[13px]">
              {group.series.length}
            </span>
          </h3>
          {group.series.map((series) => (
            <WeeklySeriesRow key={series.key} series={series} />
          ))}
        </section>
      ))}
    </div>
  );
}

function WeeklySeriesRow({ series }: { series: WeeklySeries }) {
  const { activity, sessions } = series;
  const cost = getCostLabel(activity);
  const where =
    series.venues > 1
      ? formatCount(series.venues, "venue")
      : (sessions[0].place ?? null);

  return (
    <article className="grid grid-cols-[50px_minmax(0,1fr)] gap-2.5 rounded-[12px] border bg-card px-3 py-2.5 md:grid-cols-[58px_minmax(0,1fr)_auto] md:gap-3.5 md:px-3.5">
      <ActivityThumb activity={activity} />
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            href={activityHref(activity.slug, sessions[0].date.id)}
            className="text-[15px] font-semibold tracking-[-0.01em] text-foreground hover:text-foreground md:text-[17px]"
          >
            {activity.title}
          </Link>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-meta md:text-[13px]">
            <CategoryLabel category={activity.category} />
            {where ? <span>{where}</span> : null}
            {series.recurring ? <span>{formatCadence(sessions[0].date)}</span> : null}
            {cost ? (
              <span
                className={
                  cost.free
                    ? "font-semibold text-free-foreground md:hidden"
                    : "font-semibold text-secondary-foreground md:hidden"
                }
              >
                {cost.label}
              </span>
            ) : null}
          </span>
        </div>
        <ul className="flex flex-wrap gap-1.5" aria-label={`${activity.title} sessions`}>
          {sessions.map((session) => (
            <li key={`${session.activity.id}-${session.date.id}`}>
              <Link
                href={activityHref(session.activity.slug, session.date.id)}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-[8px] border border-line bg-field px-2.5 py-1 text-xs text-secondary-foreground hover:border-[#CFCCC4] hover:text-secondary-foreground hover:no-underline md:text-[13px]"
              >
                <span className="font-semibold text-foreground">{session.label}</span>
                {series.venues > 1 && session.place ? (
                  <span>· {session.place}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {cost ? (
        <span className="hidden self-center md:block">
          <CostPill cost={cost} />
        </span>
      ) : null}
    </article>
  );
}
