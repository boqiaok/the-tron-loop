import type { Metadata } from "next";

import {
  ActivityDirectory,
  type ActivitySearchParams,
} from "@/components/activities/activity-directory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "This week",
};

export default function ThisWeekPage({
  searchParams,
}: {
  searchParams: ActivitySearchParams;
}) {
  return (
    <ActivityDirectory
      activePage="this-week"
      heading="What’s on this week?"
      intro="Browse activities happening around Hamilton. Listings are ordered by their actual start time."
      pathname="/this-week"
      searchParams={searchParams}
      weekOffset={0}
    />
  );
}
