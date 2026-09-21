import Link from "next/link";

import { PlannerPrompt } from "@/components/home/planner-prompt";
import { WeekendPicks } from "@/components/home/weekend-picks";
import {
  formatCount,
  formatDayRange,
  formatShortRange,
} from "@/lib/activities/format";
import type { WeekRange } from "@/lib/dates/week-range";
import type { Activity } from "@/types/activity";

interface HomePageProps {
  weekend: { range: { from: string; to: string }; activities: Activity[]; total: number };
  weekTotal: number;
  nextWeek: WeekRange;
  nextWeekTotal: number;
  regularTotal: number;
}

export function HomePage({
  weekend,
  weekTotal,
  nextWeek,
  nextWeekTotal,
  regularTotal,
}: HomePageProps) {
  return (
    <main>
      <section className="border-b bg-card">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3.5 px-[18px] pt-[22px] pb-5 md:items-center md:gap-[22px] md:px-8 md:pt-[52px] md:pb-10">
          <div className="flex max-w-[640px] flex-col gap-2.5 md:text-center">
            <h1 className="text-[28px] leading-[1.1] tracking-[-0.03em] md:text-[42px] md:leading-[1.06] md:tracking-[-0.035em]">
              What’s on in Hamilton{" "}
              <br className="hidden md:inline" />
              <span className="font-serif font-normal italic tracking-normal">
                this week
              </span>
            </h1>
            <p className="hidden text-base leading-[1.55] text-body md:block">
              Local markets, workshops, music and family activities, collected
              from council, library and community sources — and checked every
              week.
            </p>
          </div>
          <PlannerPrompt />
          <span className="hidden text-[13px] text-muted-foreground md:block">
            No account needed · Every listing links back to the organiser
          </span>
        </div>
      </section>

      <WeekendPicks
        activities={weekend.activities}
        range={weekend.range}
        rangeLabel={formatDayRange(weekend.range)}
        weekendTotal={weekend.total}
        weekTotal={weekTotal}
      />

      <section className="mx-auto grid max-w-[1120px] gap-4 px-[18px] pb-8 md:grid-cols-2 md:px-8 md:pb-10">
        <Link
          href="/whats-on?scope=regular"
          className="group flex flex-col gap-2 rounded-[16px] bg-primary p-[22px] text-primary-foreground hover:text-primary-foreground hover:no-underline"
        >
          <span className="text-xs font-semibold tracking-[0.14em] text-[#9A9DA4] uppercase">
            Every week, same time
          </span>
          <span className="text-xl font-semibold tracking-[-0.02em]">
            {formatCount(regularTotal, "regular activity")}
          </span>
          <span className="text-sm leading-[1.55] text-[#B8BBC1]">
            English conversation groups, library sessions, walking clubs and
            social sport that repeat weekly or monthly.
          </span>
          <span className="mt-1.5 text-[15px] font-medium group-hover:underline">
            Browse regular activities →
          </span>
        </Link>
        <Link
          href="/whats-on?scope=next-week"
          className="group flex flex-col gap-2 rounded-[16px] border bg-card p-[22px] text-foreground hover:text-foreground hover:no-underline"
        >
          <span className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Plan ahead
          </span>
          <span className="text-xl font-semibold tracking-[-0.02em]">
            Next week · {formatShortRange(nextWeek)}
          </span>
          <span className="text-sm leading-[1.55] text-body">
            {formatCount(nextWeekTotal)} collected so far. Past weeks stay
            available under What’s on.
          </span>
          <span className="mt-1.5 text-[15px] font-medium text-action group-hover:underline">
            Open next week →
          </span>
        </Link>
      </section>
    </main>
  );
}
