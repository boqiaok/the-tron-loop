import { notFound } from "next/navigation";

import {
  ActivityDirectory,
  type ActivitySearchParams,
} from "@/components/activities/activity-directory";
import { getWeekRangeFromDate } from "@/lib/dates/week-range";

export const dynamic = "force-dynamic";

export default async function ArchivedWeekPage({
  params,
  searchParams,
}: {
  params: Promise<{ week: string }>;
  searchParams: ActivitySearchParams;
}) {
  const { week } = await params;
  const range = getWeekRangeFromDate(week);
  if (!range || new Date(range.from) >= new Date()) notFound();

  return (
    <ActivityDirectory
      activePage="archive"
      heading="A week in Hamilton"
      intro="Browse the activities published for this archived week."
      pathname={`/archive/${week}`}
      searchParams={searchParams}
      weekOffset={0}
      rangeOverride={range}
    />
  );
}
