import {
  ActivityDirectory,
  type ActivitySearchParams,
} from "@/components/activities/activity-directory";

export const dynamic = "force-dynamic";

export default function NextWeekPage({
  searchParams,
}: {
  searchParams: ActivitySearchParams;
}) {
  return (
    <ActivityDirectory
      activePage="next-week"
      heading="What’s on next week?"
      intro="Plan ahead with activities happening around Hamilton next week."
      pathname="/next-week"
      searchParams={searchParams}
      weekOffset={1}
    />
  );
}
