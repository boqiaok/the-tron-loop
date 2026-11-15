import type { Metadata } from "next";

import { PicksPage } from "@/components/picks/picks-page";
import { getWeekRange } from "@/lib/dates/week-range";
import { loadPicks, picksMetadata } from "./load-picks";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { guide, slug } = await loadPicks(getWeekRange(0));
  return picksMetadata(
    "This week’s picks in Hamilton",
    "/picks",
    guide ? slug : null,
  );
}

/** Always this week's picks, so one short address works on every post. */
export default async function CurrentPicksPage() {
  const range = getWeekRange(0);
  const { guide, previousWeek } = await loadPicks(range);
  return (
    <PicksPage guide={guide} range={range} current previousWeek={previousWeek} />
  );
}
