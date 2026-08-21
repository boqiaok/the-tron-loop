import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  MapPin,
  Users,
} from "lucide-react";
import Link from "next/link";

import { ActivityExplorer } from "@/components/activities/activity-explorer";
import { buttonVariants } from "@/components/ui/button";
import { getActivities, getActivityFilterOptions } from "@/lib/api/activities";
import { getWeekRange } from "@/lib/dates/week-range";
import { cn } from "@/lib/utils";
import type { ActivityCostType, ActivityFilters } from "@/types/activity";

export type ActivitySearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

interface ActivityDirectoryProps {
  activePage: "this-week" | "next-week";
  heading: string;
  intro: string;
  pathname: string;
  searchParams: ActivitySearchParams;
  weekOffset: number;
}

const COST_TYPES = new Set<ActivityCostType>(["free", "paid", "unknown"]);

export async function ActivityDirectory({
  activePage,
  heading,
  intro,
  pathname,
  searchParams,
  weekOffset,
}: ActivityDirectoryProps) {
  const filters = parseFilters(await searchParams);
  const range = getWeekRange(weekOffset);
  const [activities, filterOptions] = await Promise.all([
    getActivities(range, filters),
    getActivityFilterOptions(range),
  ]);

  return (
    <main>
      <section className="border-b px-5 py-8 sm:px-10 sm:py-10 lg:px-12">
        <p className="text-xs text-muted-foreground">
          Weekly Guides <span className="px-2 text-[var(--gold)]">/</span>{" "}
          {range.label}
        </p>
        <p className="mt-1 text-xs font-bold tracking-[0.14em] text-[var(--gold)] uppercase">
          {activePage === "this-week" ? "This week" : "Next week"} ·{" "}
          {range.label}
        </p>

        <div className="mt-3 flex items-end justify-between gap-6">
          <div className="max-w-4xl">
            <h1 className="font-heading text-4xl leading-[0.98] text-primary sm:text-5xl lg:text-6xl">
              {heading}
            </h1>
            <p className="mt-3 max-w-3xl text-pretty text-sm text-muted-foreground sm:text-base">
              {intro}
            </p>
          </div>

          <nav
            aria-label="Change week"
            className="hidden shrink-0 gap-2 sm:flex"
          >
            <WeekArrow
              href={activePage === "next-week" ? "/this-week" : undefined}
              label="Previous week"
            >
              <ArrowLeft />
            </WeekArrow>
            <WeekArrow
              href={activePage === "this-week" ? "/next-week" : undefined}
              label="Next week"
            >
              <ArrowRight />
            </WeekArrow>
          </nav>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5 text-primary" />
            {range.label}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5 text-primary" />
            {activities.total}{" "}
            {activities.total === 1 ? "activity" : "activities"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5 text-primary" />
            Hamilton, New Zealand
          </span>
        </div>

        <nav aria-label="Change week" className="mt-5 flex gap-2 sm:hidden">
          <WeekArrow
            href={activePage === "next-week" ? "/this-week" : undefined}
            label="Previous week"
          >
            <ArrowLeft />
          </WeekArrow>
          <WeekArrow
            href={activePage === "this-week" ? "/next-week" : undefined}
            label="Next week"
          >
            <ArrowRight />
          </WeekArrow>
        </nav>
      </section>

      <div className="px-5 py-4 sm:px-10 lg:px-12">
        <ActivityExplorer
          pathname={pathname}
          initialActivities={activities}
          initialFilters={filters}
          options={filterOptions}
          range={range}
        />
      </div>
    </main>
  );
}

function WeekArrow({
  href,
  label,
  children,
}: {
  href?: string;
  label: string;
  children: React.ReactNode;
}) {
  const className = cn(
    buttonVariants({ variant: "outline", size: "icon-lg" }),
    "size-10 rounded-md",
    !href && "pointer-events-none opacity-35",
  );

  if (!href) {
    return (
      <span className={className} aria-disabled="true" aria-label={label}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} aria-label={label} className={className}>
      {children}
    </Link>
  );
}

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): ActivityFilters {
  const costType = getSingleValue(searchParams.costType);
  const tag = getSingleValue(searchParams.tag);
  const suburb = getSingleValue(searchParams.suburb);
  const status = getSingleValue(searchParams.status);
  const q = getSingleValue(searchParams.q)?.trim();
  const sort = getSingleValue(searchParams.sort);
  const rawPage = Number(getSingleValue(searchParams.page) ?? "1");

  return {
    q: q && q.length <= 100 ? q : undefined,
    sort: sort === "desc" ? "desc" : "asc",
    status: status === "cancelled" ? "cancelled" : undefined,
    costType: COST_TYPES.has(costType as ActivityCostType)
      ? (costType as ActivityCostType)
      : undefined,
    tag:
      tag && tag !== "all" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag)
        ? tag
        : undefined,
    suburb:
      suburb && suburb !== "all" && suburb.length <= 120 ? suburb : undefined,
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
  };
}

function getSingleValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
