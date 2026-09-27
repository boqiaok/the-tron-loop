import Link from "next/link";

import { PicksDesk } from "@/components/admin/picks-desk";
import { getAdminWeeklyGuide } from "@/lib/api/admin-weekly-guides";
import { requireAdminSession } from "@/lib/auth/admin-session";
import {
  getWeekRange,
  getWeekRangeFromDate,
  getWeekSlug,
} from "@/lib/dates/week-range";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminPicksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { context } = await requireAdminSession();
  const { week } = await searchParams;
  const range =
    (typeof week === "string" ? getWeekRangeFromDate(week) : null) ??
    getWeekRange(0);
  const weekStart = getWeekSlug(range);
  const data = await getAdminWeeklyGuide(weekStart, context);
  const weekFrom = new Date(range.from);

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <p className="text-xs font-bold tracking-[0.14em] text-[var(--gold)] uppercase">
        Administration
      </p>
      <h1 className="mt-1 font-heading text-4xl text-primary">Weekly picks</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Candidates are scored and the best are suggested, one per organiser.
        Check them, swap in what you know is better, write one line on why
        each is worth going to, then publish. The picks lead the home page for
        the week.
      </p>

      <nav
        aria-label="Week"
        className="mt-6 flex flex-wrap items-center gap-3 text-sm"
      >
        <Link
          href={`/admin/picks?week=${getWeekSlug(getWeekRange(-1, weekFrom))}`}
          className="font-medium"
        >
          ← Previous week
        </Link>
        <span className="font-semibold text-primary">{range.label}</span>
        <Link
          href={`/admin/picks?week=${getWeekSlug(getWeekRange(1, weekFrom))}`}
          className="font-medium"
        >
          Next week →
        </Link>
      </nav>

      <PicksDesk key={weekStart} data={data} />
    </main>
  );
}
