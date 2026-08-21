import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WeekRange } from "@/lib/dates/week-range";

interface HomePageProps {
  currentCount: number;
  currentWeek: WeekRange;
  nextCount: number;
  nextWeek: WeekRange;
}

export function HomePage({
  currentCount,
  currentWeek,
  nextCount,
  nextWeek,
}: HomePageProps) {
  const currentDates = getRangeParts(currentWeek);

  return (
    <main>
      <section className="relative overflow-hidden bg-primary px-5 py-14 text-primary-foreground sm:px-10 sm:py-20 lg:grid lg:min-h-[590px] lg:grid-cols-[minmax(0,1.12fr)_minmax(23rem,0.88fr)] lg:items-center lg:gap-16 lg:px-12 xl:px-[6.875rem]">
        <div className="relative z-10 max-w-3xl">
          <p className="text-xs font-bold tracking-[0.14em] text-[#b8d6de] uppercase">
            Hamilton · {formatCompactRange(currentWeek)}
          </p>
          <h1 className="mt-5 max-w-3xl font-heading text-5xl leading-[1.02] text-white sm:text-6xl lg:text-[4rem] lg:leading-[1.06]">
            What’s on in Hamilton this week?
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
            A clear weekly collection of local markets, workshops,
            performances, family activities and community events.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              href="/this-week"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-[var(--gold)] text-foreground hover:bg-[color-mix(in_srgb,var(--gold)_84%,white)]",
              )}
            >
              Explore this week
              <ArrowRight />
            </Link>
            <span className="text-xs text-white/65">
              {formatActivityCount(currentCount)} collected
            </span>
          </div>
        </div>

        <div className="relative mx-auto mt-12 flex h-[290px] w-full max-w-[460px] items-center justify-center lg:mt-0 lg:h-[390px]">
          <div className="absolute size-[270px] rounded-full border-2 border-[#4d8fa7]/50 lg:size-[380px]" />
          <div className="absolute size-[210px] rounded-full border-2 border-[var(--gold)]/45 lg:size-[290px]" />
          <Link
            href="/this-week"
            className="relative z-10 flex h-[180px] w-[220px] -rotate-3 flex-col justify-between rounded-[22px] bg-background p-6 text-foreground shadow-2xl transition-transform hover:-rotate-1 hover:scale-[1.02] lg:h-[220px] lg:w-[270px] lg:p-7"
          >
            <span className="text-xs font-bold tracking-[0.08em] text-[var(--link)] uppercase">
              Latest issue
            </span>
            <strong className="font-heading text-3xl font-normal lg:text-4xl">
              {formatCompactRange(currentWeek)}
            </strong>
            <span className="text-sm font-bold text-accent-foreground">
              This week in Hamilton →
            </span>
          </Link>
        </div>
      </section>

      <section className="bg-background px-5 py-14 sm:px-10 sm:py-18 lg:px-12 xl:px-[6.875rem] xl:py-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.12em] text-[var(--link)] uppercase">
              Current guide
            </p>
            <h2 className="mt-3 font-heading text-3xl text-foreground sm:text-4xl lg:text-[2.625rem]">
              Everything happening this week
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
            Activities are collected from local organisers and listed in
            chronological order inside the weekly guide.
          </p>
        </div>

        <Link
          href="/this-week"
          className="mt-8 grid gap-6 rounded-2xl border bg-white p-6 shadow-[0_14px_24px_rgba(18,59,56,0.12)] transition-transform hover:-translate-y-0.5 sm:p-8 md:grid-cols-[14rem_1fr_auto] md:items-center md:gap-9"
        >
          <DateRangeTile dates={currentDates} />
          <div>
            <Badge className="bg-accent text-accent-foreground">Current</Badge>
            <h3 className="mt-2 font-heading text-2xl text-foreground sm:text-3xl">
              This week in Hamilton
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground sm:text-base">
              {formatActivityCount(currentCount)} · Markets, live music,
              workshops, family activities and community events.
            </p>
          </div>
          <span className={cn(buttonVariants({ size: "lg" }), "w-fit")}>
            Open the weekly guide
            <ArrowRight />
          </span>
        </Link>
      </section>

      <section className="bg-secondary px-5 py-14 sm:px-10 sm:py-18 lg:px-12 xl:px-[6.875rem] xl:py-20">
        <div>
          <p className="text-xs font-bold tracking-[0.12em] text-[var(--link)] uppercase">
            Coming up
          </p>
          <h2 className="mt-3 font-heading text-3xl text-foreground sm:text-4xl lg:text-[2.625rem]">
            Plan a little further ahead
          </h2>
        </div>

        <Link
          href="/next-week"
          className="mt-8 block max-w-2xl rounded-xl border border-primary/10 bg-white p-7 transition-transform hover:-translate-y-0.5 hover:shadow-md"
        >
          <p className="text-xs font-bold tracking-wide text-[var(--link)] uppercase">
            {formatCompactRange(nextWeek)}
          </p>
          <h3 className="mt-2 font-heading text-2xl text-foreground sm:text-3xl">
            Next week
          </h3>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {formatActivityCount(nextCount)} collected so far
          </p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--link)]">
            Preview guide
            <ArrowRight className="size-4" />
          </span>
        </Link>
      </section>

      <section className="grid gap-4 border-t bg-white px-5 py-8 sm:px-10 md:grid-cols-[auto_1fr] md:gap-12 lg:px-12 xl:px-[6.875rem]">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <MapPin className="size-4 text-primary" />
          Collected locally. Checked weekly.
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Every activity links back to its original organiser or source so you
          can confirm the latest information before attending.
        </p>
      </section>
    </main>
  );
}

function DateRangeTile({ dates }: { dates: ReturnType<typeof getRangeParts> }) {
  return (
    <div className="flex items-baseline gap-2 text-primary">
      <CalendarDays className="mr-1 size-5 self-center text-[var(--gold)] md:hidden" />
      <strong className="font-heading text-4xl font-normal sm:text-5xl">
        {dates.startDay}
      </strong>
      <span className="text-[0.65rem] font-bold">{dates.startMonth}</span>
      <span className="text-[var(--gold)]">—</span>
      <strong className="font-heading text-4xl font-normal sm:text-5xl">
        {dates.endDay}
      </strong>
      <span className="text-[0.65rem] font-bold">{dates.endMonth}</span>
    </div>
  );
}

function getRangeParts(range: WeekRange) {
  const start = new Date(range.from);
  const end = new Date(new Date(range.to).getTime() - 1);
  const day = new Intl.DateTimeFormat("en-NZ", {
    day: "2-digit",
    timeZone: "Pacific/Auckland",
  });
  const month = new Intl.DateTimeFormat("en-NZ", {
    month: "short",
    timeZone: "Pacific/Auckland",
  });

  return {
    startDay: day.format(start),
    startMonth: month.format(start).toUpperCase(),
    endDay: day.format(end),
    endMonth: month.format(end).toUpperCase(),
  };
}

function formatCompactRange(range: WeekRange): string {
  const dates = getRangeParts(range);
  const startMonth = titleCase(dates.startMonth);
  const endMonth = titleCase(dates.endMonth);

  if (startMonth === endMonth) {
    return `${Number(dates.startDay)}–${Number(dates.endDay)} ${startMonth}`;
  }

  return `${Number(dates.startDay)} ${startMonth}–${Number(dates.endDay)} ${endMonth}`;
}

function formatActivityCount(count: number): string {
  return `${count} ${count === 1 ? "activity" : "activities"}`;
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
