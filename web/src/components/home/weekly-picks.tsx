import Link from "next/link";

import { activityHref } from "@/components/activities/activity-row";
import { ActivityThumb } from "@/components/activities/activity-thumb";
import { CostPill } from "@/components/activities/cost-pill";
import {
  formatDayLabel,
  formatTime,
  formatVenueShort,
  getCostLabel,
} from "@/lib/activities/format";
import { cn } from "@/lib/utils";
import type { WeeklyGuide, WeeklyGuideItem } from "@/types/weekly-guide";

/** The editor's short list for the week, in their order, with their note. */
export function WeeklyPicks({
  guide,
  rangeLabel,
  weekTotal,
}: {
  guide: WeeklyGuide;
  rangeLabel: string;
  weekTotal: number;
}) {
  return (
    <section
      aria-labelledby="picks-heading"
      className="mx-auto flex max-w-[1120px] flex-col gap-3 px-[18px] pt-[18px] pb-6 md:gap-5 md:px-8 md:py-8"
    >
      <div className="flex items-baseline justify-between gap-4 md:items-end">
        <div className="flex flex-col gap-1">
          <h2 id="picks-heading" className="text-lg md:text-[22px]">
            This week’s{" "}
            <span className="font-serif font-normal italic">
              {guide.items.length} picks
            </span>
          </h2>
          <span className="text-sm text-muted-foreground">
            {rangeLabel} · Chosen from {weekTotal} listings
          </span>
        </div>
        <Link
          href="/whats-on"
          className="text-sm font-medium whitespace-nowrap text-action md:text-[15px]"
        >
          <span className="md:hidden">See all {weekTotal}</span>
          <span className="hidden md:inline">
            See all {weekTotal} this week →
          </span>
        </Link>
      </div>

      {guide.intro ? (
        <p className="max-w-[680px] font-serif text-[17px] leading-[1.5] text-body italic md:text-lg">
          {guide.intro}
        </p>
      ) : null}

      <ol className="grid gap-2.5 md:grid-cols-2 md:gap-3">
        {guide.items.map((item, index) => (
          <li key={item.activity.id}>
            <PickCard item={item} position={index + 1} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function PickCard({
  item: { activity, note },
  position,
}: {
  item: WeeklyGuideItem;
  position: number;
}) {
  const date = activity.dates[0];
  const cancelled = activity.status === "cancelled";
  const cost = getCostLabel(activity);
  const venue = formatVenueShort(activity);
  const when = date
    ? `${formatDayLabel(date.startsAt)} · ${date.isAllDay ? "All day" : formatTime(date.startsAt)}`
    : null;

  return (
    <Link
      href={activityHref(activity.slug, date?.id)}
      className={cn(
        "grid h-full grid-cols-[28px_minmax(0,1fr)] gap-3 rounded-[14px] border bg-card p-3.5 text-foreground transition-colors hover:border-[#CFCCC4] hover:text-foreground hover:no-underline focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none md:p-4",
        cancelled && "bg-sunken opacity-70",
      )}
    >
      <span
        aria-hidden="true"
        className="font-serif text-[26px] leading-none text-action italic"
      >
        {position}
      </span>
      <span className="flex min-w-0 flex-col gap-2">
        <span className="flex min-w-0 items-stretch gap-3">
          <ActivityThumb activity={activity} />
          <span className="flex min-w-0 flex-col justify-center gap-0.5">
            <span
              className={cn(
                "text-[15px] font-semibold tracking-[-0.01em] md:text-[17px]",
                cancelled && "text-muted-foreground line-through",
              )}
            >
              {activity.title}
            </span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-meta md:text-[13px]">
              {when ? <span>{when}</span> : null}
              {venue ? <span>{venue}</span> : null}
              {cancelled ? (
                <span className="rounded-full bg-cancelled px-2 py-0.5 text-[11px] font-semibold text-cancelled-foreground">
                  Cancelled
                </span>
              ) : cost ? (
                <CostPill cost={cost} />
              ) : null}
            </span>
          </span>
        </span>
        {note ? (
          <span className="text-sm leading-[1.5] text-body">{note}</span>
        ) : null}
      </span>
    </Link>
  );
}
