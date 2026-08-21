import type { Metadata } from "next";

import { HomePage } from "@/components/home/home-page";
import { getActivityCount } from "@/lib/api/activities";
import { getWeekRange } from "@/lib/dates/week-range";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hamilton’s weekly activity guide",
};

export default async function Home() {
  const currentWeek = getWeekRange(0);
  const nextWeek = getWeekRange(1);
  const [currentCount, nextCount] = await Promise.all([
    getActivityCount(currentWeek),
    getActivityCount(nextWeek),
  ]);

  return (
    <HomePage
      currentCount={currentCount}
      currentWeek={currentWeek}
      nextCount={nextCount}
      nextWeek={nextWeek}
    />
  );
}
