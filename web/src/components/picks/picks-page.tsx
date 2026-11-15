import Link from "next/link";

import { PickCard } from "@/components/home/weekly-picks";
import { formatCount, formatShortRange } from "@/lib/activities/format";
import type { WeekRange } from "@/lib/dates/week-range";
import type { WeeklyGuide } from "@/types/weekly-guide";

/**
 * A week's picks on a page of their own, at an address that can be shared
 * or written on a social post.
 */
export function PicksPage({
  guide,
  range,
  current,
  previousWeek,
}: {
  guide: WeeklyGuide | null;
  range: WeekRange;
  /** The week happening now, rather than an archived one. */
  current: boolean;
  /** The week before, when it has published picks. */
  previousWeek: string | null;
}) {
  const rangeLabel = formatShortRange(range);
  const whatsOn = current ? "/whats-on" : null;

  return (
    <main className="mx-auto flex max-w-[820px] flex-col gap-6 px-[18px] pt-8 pb-12 md:gap-7 md:px-8 md:pt-11 md:pb-16">
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase md:text-[13px]">
          Weekly picks · {rangeLabel}
        </span>
        <h1 className="text-[30px] leading-[1.08] tracking-[-0.03em] md:text-[44px] md:leading-[1.05] md:tracking-[-0.035em]">
          Hamilton {current ? "this week" : rangeLabel}:{" "}
          <span className="font-serif font-normal tracking-normal italic">
            {guide ? formatCount(guide.items.length, "pick") : "picks"}
          </span>
        </h1>
        {guide?.intro ? (
          <p className="font-serif text-lg leading-[1.5] text-body italic md:text-[21px]">
            {guide.intro}
          </p>
        ) : null}
        {guide ? (
          <span className="text-sm text-meta">Chosen by our editor</span>
        ) : null}
      </div>

      {guide ? (
        <ol className="flex flex-col gap-3">
          {guide.items.map((item, index) => (
            <li key={item.activity.id}>
              <PickCard item={item} position={index + 1} />
            </li>
          ))}
        </ol>
      ) : (
        <div className="flex flex-col items-start gap-2 rounded-[14px] border border-dashed border-[#C9C6BE] bg-[#FBFAF7] px-5 py-6">
          <p className="text-[15px] font-semibold">This week’s picks aren’t out yet</p>
          <p className="text-sm text-body">
            Browse everything on this week in the meantime.
          </p>
        </div>
      )}

      {whatsOn ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[16px] border bg-card px-5 py-4 md:px-[22px] md:py-5">
          <span className="flex flex-col gap-0.5">
            <span className="text-[17px] font-semibold">Want more this week?</span>
            <span className="text-sm text-body">
              Highlights, weekly sessions and exhibitions.
            </span>
          </span>
          <Link
            href={whatsOn}
            className="inline-flex h-11 items-center rounded-[12px] bg-action px-[18px] text-[15px] font-medium text-white hover:bg-action-hover hover:text-white hover:no-underline"
          >
            Browse what’s on
          </Link>
        </div>
      ) : null}

      {previousWeek ? (
        <nav aria-label="Other weeks" className="text-[15px]">
          <Link href={`/picks/${previousWeek}`} className="font-medium text-action">
            ← Picks for the week before
          </Link>
        </nav>
      ) : null}
    </main>
  );
}
