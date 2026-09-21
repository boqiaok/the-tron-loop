import { TZDate } from "@date-fns/tz";
import { startOfDay } from "date-fns";
import type { Metadata } from "next";

import { HomePage } from "@/components/home/home-page";
import { EMPTY_FILTERS, narrowRange } from "@/lib/activities/filters";
import {
  getActivities,
  getActivityCount,
  getRegularActivities,
} from "@/lib/api/activities";
import { ACTIVITY_TIME_ZONE, getWeekRange } from "@/lib/dates/week-range";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Plan your day in Hamilton",
};

export default async function Home() {
  const currentWeek = getWeekRange(0);
  const nextWeek = getWeekRange(1);
  const weekend = currentWeekend(currentWeek);
  const [weekendPage, weekTotal, nextWeekTotal, regular] = await Promise.all([
    getActivities(weekend, EMPTY_FILTERS, { limit: 50 }),
    getActivityCount(currentWeek),
    getActivityCount(nextWeek),
    getRegularActivities(),
  ]);

  return (
    <HomePage
      weekend={{
        range: weekend,
        activities: weekendPage.items,
        total: weekendPage.total,
      }}
      weekTotal={weekTotal}
      nextWeek={nextWeek}
      nextWeekTotal={nextWeekTotal}
      regularTotal={regular.length}
    />
  );
}

/** Saturday and Sunday of this week, starting today once the weekend begins. */
function currentWeekend(week: { from: string; to: string }) {
  const weekend = narrowRange(week, "weekend") ?? week;
  const today = startOfDay(new TZDate(new Date(), ACTIVITY_TIME_ZONE));
  return today > new Date(weekend.from)
    ? { from: today.toISOString(), to: weekend.to }
    : weekend;
}
