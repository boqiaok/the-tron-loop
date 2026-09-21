import { TZDate } from "@date-fns/tz";
import { addDays, startOfDay } from "date-fns";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ActivityDetail } from "@/components/activity-detail/activity-detail";
import { getBackTarget, pickOccurrence } from "@/lib/activities/detail";
import { EMPTY_FILTERS, type SearchParams } from "@/lib/activities/filters";
import type { Occurrence } from "@/lib/activities/occurrences";
import { getActivities, getActivity } from "@/lib/api/activities";
import { ACTIVITY_TIME_ZONE } from "@/lib/dates/week-range";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const activity = await getActivity((await params).slug);
  return activity
    ? { title: activity.title, description: activity.summary ?? undefined }
    : { title: "Activity not found" };
}

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<SearchParams>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const activity = await getActivity(slug);
  if (!activity) notFound();

  const dateId = Array.isArray(query.date) ? query.date[0] : query.date;
  const date = pickOccurrence(activity.dates, dateId);
  if (!date) notFound();

  const nearby = await getNearby(activity, date.startsAt);
  const ended = new Date(date.endsAt ?? date.startsAt) < new Date();

  return (
    <ActivityDetail
      activity={activity}
      date={date}
      back={getBackTarget(date)}
      nearby={nearby.occurrences}
      nearbyTotal={nearby.total}
      canPlan={activity.status !== "cancelled" && !ended && !date.isAllDay}
    />
  );
}

/** Other activities the same local day, closest to this venue first. */
async function getNearby(
  activity: NonNullable<Awaited<ReturnType<typeof getActivity>>>,
  startsAt: string,
): Promise<{ occurrences: Occurrence[]; total: number }> {
  const day = startOfDay(new TZDate(startsAt, ACTIVITY_TIME_ZONE));
  const venue = activity.venue;
  const located = venue?.latitude != null && venue?.longitude != null;
  try {
    const page = await getActivities(
      { from: day.toISOString(), to: addDays(day, 1).toISOString() },
      {
        ...EMPTY_FILTERS,
        sortBy: located ? "distance" : "date",
        latitude: located ? venue.latitude! : undefined,
        longitude: located ? venue.longitude! : undefined,
      },
      { limit: 4 },
    );
    const others = page.items.filter((item) => item.id !== activity.id);
    return {
      occurrences: others
        .slice(0, 3)
        .flatMap((item) => (item.dates[0] ? [{ activity: item, date: item.dates[0] }] : [])),
      total: Math.max(0, page.total - (page.items.length > others.length ? 1 : 0)),
    };
  } catch {
    return { occurrences: [], total: 0 };
  }
}
