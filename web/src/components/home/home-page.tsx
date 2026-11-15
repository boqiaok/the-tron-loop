import Link from "next/link";

import { PlannerPrompt } from "@/components/home/planner-prompt";
import { WeekendPicks } from "@/components/home/weekend-picks";
import { WeeklyPicks } from "@/components/home/weekly-picks";
import {
  formatCount,
  formatDayRange,
  formatShortRange,
} from "@/lib/activities/format";
import type { WeekRange } from "@/lib/dates/week-range";
import type { Activity, ActivityFilterOptions } from "@/types/activity";
import type { WeeklyGuide } from "@/types/weekly-guide";

interface HomePageProps {
  weekend: { range: { from: string; to: string }; activities: Activity[]; total: number };
  /** The published picks for the current week, when the editors have any. */
  guide: WeeklyGuide | null;
  currentWeek: WeekRange;
  /** This week's listings from today, by listing tier. */
  tiers: ActivityFilterOptions["tiers"];
  nextWeek: WeekRange;
  nextWeekTotal: number;
}

export function HomePage({
  weekend,
  guide,
  currentWeek,
  tiers,
  nextWeek,
  nextWeekTotal,
}: HomePageProps) {
  const weekTotal = tiers.highlights + tiers.regular + tiers.exhibitions;
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

      {guide ? (
        <WeeklyPicks
          guide={guide}
          rangeLabel={formatShortRange(currentWeek)}
          weekTotal={weekTotal}
        />
      ) : (
        <WeekendPicks
          activities={weekend.activities}
          range={weekend.range}
          rangeLabel={formatDayRange(weekend.range)}
          weekendTotal={weekend.total}
          highlightsTotal={tiers.highlights}
        />
      )}

      <section
        aria-labelledby="browse-heading"
        className="mx-auto flex max-w-[1120px] flex-col gap-3 px-[18px] pb-8 md:gap-4 md:px-8 md:pb-10"
      >
        <h2 id="browse-heading" className="text-lg md:text-xl">
          Browse the week
        </h2>
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          <TierCard
            href="/whats-on"
            eyebrow="Highlights"
            title={formatCount(tiers.highlights, "one-off event")}
            body="Gigs, shows, markets and family days that happen once or twice."
            cta="Open highlights →"
            dark
          />
          <TierCard
            href="/whats-on?tier=regular"
            eyebrow="Every week"
            title={formatCount(
              tiers.regular + tiers.recurring,
              "regular session",
            )}
            body="Storytime, LEGO Club, conversation groups, clubs and classes that run every week."
            cta="Find a session →"
          />
          <TierCard
            href="/whats-on?tier=exhibitions"
            eyebrow="Exhibitions on now"
            title={`${tiers.exhibitions} to visit any day`}
            body="Museum and gallery exhibitions open most days this week."
            cta="See exhibitions →"
          />
        </div>
        <Link
          href="/whats-on?scope=next-week"
          className="self-start text-[15px] font-medium text-action"
        >
          Plan ahead: next week, {formatShortRange(nextWeek)} ·{" "}
          {formatCount(nextWeekTotal)} so far →
        </Link>
      </section>
    </main>
  );
}

function TierCard({
  href,
  eyebrow,
  title,
  body,
  cta,
  dark = false,
}: {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  dark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        dark
          ? "group flex flex-col gap-2 rounded-[16px] bg-primary p-[22px] text-primary-foreground hover:text-primary-foreground hover:no-underline"
          : "group flex flex-col gap-2 rounded-[16px] border bg-card p-[22px] text-foreground hover:text-foreground hover:no-underline"
      }
    >
      <span
        className={
          dark
            ? "text-xs font-semibold tracking-[0.14em] text-[#9A9DA4] uppercase"
            : "text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase"
        }
      >
        {eyebrow}
      </span>
      <span className="text-xl font-semibold tracking-[-0.02em]">{title}</span>
      <span
        className={
          dark
            ? "text-sm leading-[1.55] text-[#B8BBC1]"
            : "text-sm leading-[1.55] text-body"
        }
      >
        {body}
      </span>
      <span
        className={
          dark
            ? "mt-1.5 text-[15px] font-medium group-hover:underline"
            : "mt-1.5 text-[15px] font-medium text-action group-hover:underline"
        }
      >
        {cta}
      </span>
    </Link>
  );
}
