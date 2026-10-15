import type { Metadata } from "next";

import { HomePage } from "@/components/home/home-page";
import { EMPTY_FILTERS, narrowRange } from "@/lib/activities/filters";
import {
  getActivities,
  getActivityCount,
  getRegularActivities,
} from "@/lib/api/activities";
import { getWeeklyGuide } from "@/lib/api/weekly-guides";
import { getWeekRange, getWeekSlug } from "@/lib/dates/week-range";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "What’s on in Hamilton this week",
  description:
    "Things to do in Hamilton this week and weekend: markets, workshops, music and family activities from council, library and community sources.",
  alternates: { canonical: "/" },
};

export default async function Home() {
  const currentWeek = getWeekRange(0);
  const nextWeek = getWeekRange(1);
  // Saturday and Sunday of this week, starting today once the weekend begins.
  const weekend = narrowRange(currentWeek, "weekend") ?? currentWeek;
  const [weekendPage, weekTotal, nextWeekTotal, regular, guide] =
    await Promise.all([
      getActivities(weekend, EMPTY_FILTERS, { limit: 50 }),
      getActivityCount(currentWeek),
      getActivityCount(nextWeek),
      getRegularActivities(),
      getWeeklyGuide(getWeekSlug(currentWeek)),
    ]);

  return (
    <HomePage
      weekend={{
        range: weekend,
        activities: weekendPage.items,
        total: weekendPage.total,
      }}
      guide={guide?.items.length ? guide : null}
      currentWeek={currentWeek}
      weekTotal={weekTotal}
      nextWeek={nextWeek}
      nextWeekTotal={nextWeekTotal}
      regularTotal={regular.length}
    />
  );
}

