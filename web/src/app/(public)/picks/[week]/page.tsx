import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PicksPage } from "@/components/picks/picks-page";
import {
  getWeekRange,
  getWeekRangeFromDate,
  getWeekSlug,
} from "@/lib/dates/week-range";
import { loadPicks, picksMetadata } from "../load-picks";

export const dynamic = "force-dynamic";

type Params = Promise<{ week: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { week } = await params;
  const range = getWeekRangeFromDate(week);
  if (!range) return {};
  return picksMetadata(
    `Picks for ${range.label} in Hamilton`,
    `/picks/${week}`,
    week,
  );
}

/** One week's picks, kept for posts that link to that week. */
export default async function WeekPicksPage({ params }: { params: Params }) {
  const { week } = await params;
  const range = getWeekRangeFromDate(week);
  if (!range) notFound();
  const { guide, previousWeek } = await loadPicks(range);
  if (!guide) notFound();
  const current = getWeekSlug(getWeekRange(0)) === week;

  return (
    <PicksPage
      guide={guide}
      range={range}
      current={current}
      previousWeek={previousWeek}
    />
  );
}
