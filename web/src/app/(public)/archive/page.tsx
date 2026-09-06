import { ArrowRight, CalendarDays } from "lucide-react";
import Link from "next/link";

import { getActivityCount } from "@/lib/api/activities";
import { getWeekRange, getWeekSlug } from "@/lib/dates/week-range";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const weeks = await Promise.all(
    Array.from({ length: 12 }, async (_, index) => {
      const range = getWeekRange(-(index + 1));
      return { range, count: await getActivityCount(range) };
    }),
  );

  return (
    <main className="px-5 py-8 sm:px-10 sm:py-10 lg:px-12">
      <p className="text-xs font-bold tracking-[0.14em] text-[var(--gold)] uppercase">Weekly guides</p>
      <h1 className="mt-2 font-heading text-5xl leading-none text-primary sm:text-6xl">Archive</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
        Browse activity guides from the previous twelve weeks.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {weeks.map(({ range, count }) => (
          <Link
            key={range.from}
            href={`/archive/${getWeekSlug(range)}`}
            className="group flex items-center justify-between gap-4 rounded-xl border bg-white p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
          >
            <span>
              <span className="flex items-center gap-2 font-semibold text-primary">
                <CalendarDays className="size-4" />
                {range.label}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {count} {count === 1 ? "activity" : "activities"}
              </span>
            </span>
            <ArrowRight className="size-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </main>
  );
}
