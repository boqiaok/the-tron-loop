import Link from "next/link";

import { ActivityRow } from "@/components/activities/activity-row";
import { CategoryLabel } from "@/components/activities/category-label";
import { CostPill } from "@/components/activities/cost-pill";
import {
  AddToPlanButton,
  CalendarButton,
  ShareButton,
  type PlanSeed,
} from "@/components/activity-detail/detail-actions";
import type { BackTarget } from "@/lib/activities/detail";
import {
  getGoodToKnow,
  getMapEmbedUrl,
  getMapsUrl,
  getSourceHost,
} from "@/lib/activities/detail";
import {
  formatDayLabel,
  formatDistance,
  formatTime,
  getCostLabel,
  getDayKey,
} from "@/lib/activities/format";
import type { Occurrence } from "@/lib/activities/occurrences";
import { cn } from "@/lib/utils";
import type { Activity, ActivityDate } from "@/types/activity";

export function ActivityDetail({
  activity,
  date,
  back,
  nearby,
  nearbyTotal,
  canPlan,
}: {
  activity: Activity;
  date: ActivityDate;
  back: BackTarget;
  nearby: Occurrence[];
  nearbyTotal: number;
  canPlan: boolean;
}) {
  const cancelled = activity.status === "cancelled";
  const cost = getCostLabel(activity);
  const venue = activity.venue;
  const dayLabel = formatDayLabel(date.startsAt);
  const timeLabel = date.isAllDay
    ? "All day"
    : `${formatTime(date.startsAt)}${date.endsAt ? `–${formatTime(date.endsAt)}` : ""}`;
  const visit =
    activity.scheduleMode === "window"
      ? `Drop in${activity.visitMinutes ? `, about ${activity.visitMinutes} minutes` : ""}`
      : null;
  const goodToKnow = getGoodToKnow(activity);
  const sourceHost = getSourceHost(activity.sourceUrl);
  const collected = formatDayLabel(activity.createdAt).split(" ").slice(1).join(" ");
  const otherDates = activity.dates.filter((item) => item.id !== date.id).slice(0, 6);
  const description = activity.summary && !activity.description.startsWith(
    activity.summary.replace(/\s*(\.\.\.|…)$/, ""),
  )
    ? `${activity.summary}\n\n${activity.description}`
    : activity.description;
  const seed: PlanSeed = {
    title: activity.title,
    dateId: date.id,
    localDate: getDayKey(date.startsAt),
    startTime: formatTime(date.startsAt),
    endTime: date.endsAt ? formatTime(date.endsAt) : null,
  };
  const venueLine = venue
    ? [venue.address ?? venue.suburb, formatDistance(activity.distanceKm)]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <main className="bg-card pb-24 md:pb-0">
      {/* Back bar: desktop under the header, mobile replaces the header */}
      <div className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between px-[18px] md:h-auto md:px-8 md:py-4">
          <Link href={back.href} className="text-sm font-medium text-action">
            ‹ <span className="md:hidden">{back.shortLabel}</span>
            <span className="hidden md:inline">{back.label}</span>
          </Link>
          <span className="md:hidden">
            <ShareButton title={activity.title} variant="text" />
          </span>
        </div>
      </div>

      <Cover activity={activity} />

      <div className="mx-auto grid max-w-[1120px] gap-7 px-[18px] pt-[18px] pb-8 md:grid-cols-[minmax(0,1fr)_340px] md:px-8 md:pt-7">
        <div className="flex min-w-0 flex-col gap-[18px] md:gap-5">
          <div className="flex flex-col gap-2 md:gap-2.5">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-meta md:gap-x-3.5 md:text-sm">
              <CategoryLabel category={activity.category} className="md:gap-[7px] [&>span:first-child]:md:size-2" />
              <span className="hidden md:inline">
                {dayLabel} · {timeLabel}
              </span>
              {visit ? <span className="hidden md:inline">{visit}</span> : null}
              {cost ? (
                <>
                  <span aria-hidden="true" className="md:hidden">·</span>
                  <span
                    className={cn(
                      "font-semibold md:hidden",
                      cost.free ? "text-free-foreground" : "text-secondary-foreground",
                    )}
                  >
                    {cost.label}
                  </span>
                </>
              ) : null}
            </div>
            <h1
              className={cn(
                "text-[25px] leading-[1.14] tracking-[-0.03em] md:text-4xl md:leading-[1.08]",
                cancelled && "text-muted-foreground line-through",
              )}
            >
              {activity.title}
            </h1>
            <span className="text-[15px] font-semibold md:hidden">
              {dayLabel} · {timeLabel}
            </span>
            {visit ? <span className="text-[13px] text-muted-foreground md:hidden">{visit}</span> : null}
            {cancelled ? (
              <p className="w-fit rounded-full bg-cancelled px-3 py-1 text-[13px] font-semibold text-cancelled-foreground">
                Cancelled by the organiser
              </p>
            ) : null}
            <p className="max-w-[60ch] text-[15px] leading-[1.6] whitespace-pre-line text-body md:text-[17px]">
              {description}
            </p>
          </div>

          {otherDates.length ? (
            <div className="flex flex-col gap-1.5 text-sm">
              <span className="text-xs font-bold tracking-[0.1em] text-muted-foreground uppercase">
                Other times
              </span>
              <div className="flex flex-wrap gap-1.5">
                {otherDates.map((item) => (
                  <Link
                    key={item.id}
                    href={`/activities/${activity.slug}?date=${item.id}`}
                    className="rounded-full border border-line px-3 py-1.5 text-[13px] text-secondary-foreground hover:bg-secondary hover:no-underline"
                  >
                    {formatDayLabel(item.startsAt)} · {formatTime(item.startsAt)}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-2.5 md:grid-cols-2 md:gap-3.5">
            <InfoCard label="Where">
              {venue ? (
                <>
                  <span className="text-[15px] font-semibold md:text-base">{venue.name}</span>
                  {venueLine ? <span className="text-[13px] text-body md:text-sm">{venueLine}</span> : null}
                  <a
                    href={getMapsUrl(venue)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[13px] font-medium text-action md:text-sm"
                  >
                    Open in maps
                  </a>
                </>
              ) : (
                <span className="text-sm text-body">Venue not listed — see the organiser’s page.</span>
              )}
            </InfoCard>
            <InfoCard label="Cost" className="hidden md:flex">
              <span className="text-base font-semibold">{cost?.label ?? "Price not listed"}</span>
              {activity.costDetails ? (
                <span className="text-sm text-body">{activity.costDetails}</span>
              ) : null}
            </InfoCard>
            <InfoCard label="Good to know">
              <span className="text-[13px] leading-[1.6] text-body md:text-sm">
                {goodToKnow.join(" · ")}
              </span>
            </InfoCard>
            {activity.tags.length ? (
              <InfoCard label="Tags" className="hidden md:flex">
                <span className="text-sm leading-[1.6] text-body">
                  {activity.tags.map((tag) => tag.name.toLowerCase()).join(" · ")}
                </span>
              </InfoCard>
            ) : null}
          </div>

          {nearby.length ? (
            <section className="hidden flex-col gap-3 border-t pt-[18px] md:flex">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg">Also on that day, nearby</h2>
                {nearbyTotal > nearby.length ? (
                  <Link href={back.href} className="text-sm font-medium text-action">
                    See all {nearbyTotal}
                  </Link>
                ) : null}
              </div>
              {nearby.map((occurrence) => (
                <ActivityRow key={occurrence.date.id} occurrence={occurrence} />
              ))}
            </section>
          ) : null}

          <ListedBy
            className="border-t pt-3.5 md:hidden"
            sourceHost={sourceHost}
            sourceUrl={activity.sourceUrl}
            collected={collected}
          />
        </div>

        <aside className="hidden flex-col gap-3.5 self-start md:flex">
          <div className="flex flex-col gap-3 rounded-[16px] border p-[18px]">
            <div className="flex items-baseline justify-between">
              <span className="text-base font-semibold">{dayLabel}</span>
              {cost ? <CostPill cost={cost} /> : null}
            </div>
            {canPlan ? <AddToPlanButton seed={seed} /> : null}
            <CalendarButton activity={activity} date={date} />
            <ShareButton title={activity.title} />
          </div>

          {venue ? (
            <div className="overflow-hidden rounded-[16px] border">
              {venue.latitude != null && venue.longitude != null ? (
                <iframe
                  title={`Map of ${venue.name}`}
                  src={getMapEmbedUrl(venue.latitude, venue.longitude)}
                  loading="lazy"
                  className="block h-[150px] w-full border-0 bg-[#E6E2DA]"
                />
              ) : null}
              <div className="flex flex-col gap-1 p-3.5">
                <span className="text-sm font-semibold">{venue.suburb ?? venue.name}</span>
                <a
                  href={getMapsUrl(venue)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13px] text-action"
                >
                  Directions in maps
                </a>
              </div>
            </div>
          ) : null}

          <ListedBy
            className="rounded-[16px] border p-[18px]"
            sourceHost={sourceHost}
            sourceUrl={activity.sourceUrl}
            collected={collected}
          />
        </aside>
      </div>

      {/* Mobile: one pinned bar with time, cost and the primary action */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t bg-card px-[18px] py-3 md:hidden">
        <div className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="text-sm font-semibold">
            {timeLabel}
            {cost ? ` · ${cost.label}` : ""}
          </span>
          {venue ? <span className="truncate text-xs text-muted-foreground">{venue.name}</span> : null}
        </div>
        {canPlan ? (
          <AddToPlanButton seed={seed} label="Add to plan" className="px-5 py-3" />
        ) : activity.sourceUrl ? (
          <a
            href={activity.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-action px-5 py-3 text-[15px] font-semibold text-white"
          >
            View listing
          </a>
        ) : null}
      </div>
    </main>
  );
}

function Cover({ activity }: { activity: Activity }) {
  return (
    <div className="aspect-video w-full overflow-hidden border-b bg-[#E6E2DA] md:mx-auto md:aspect-auto md:h-[260px]">
      {activity.imageUrl ? (
        // Organiser photos come from many hosts; see ActivityThumb.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={activity.imageUrl}
          alt=""
          className={cn(
            "size-full object-cover",
            activity.status === "cancelled" && "grayscale",
          )}
        />
      ) : null}
    </div>
  );
}

function InfoCard({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-[12px] border p-3.5 md:gap-[5px] md:p-4", className)}>
      <span className="text-xs font-bold tracking-[0.1em] text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

function ListedBy({
  className,
  sourceHost,
  sourceUrl,
  collected,
}: {
  className?: string;
  sourceHost: string | null;
  sourceUrl: string | null;
  collected: string;
}) {
  return (
    <div className={cn("flex flex-col gap-[5px] md:gap-1.5", className)}>
      <span className="text-xs font-bold tracking-[0.1em] text-muted-foreground uppercase">
        Listed by
      </span>
      <span className="text-sm font-semibold md:text-[15px]">
        {sourceHost ?? "The Tron Loop"}
      </span>
      <span className="text-[13px] leading-[1.55] text-body">
        Collected {collected}. Details can change — check the source before you
        go.
      </span>
      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-action"
        >
          View original listing
        </a>
      ) : null}
    </div>
  );
}
