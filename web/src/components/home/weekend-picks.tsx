"use client";

import Link from "next/link";
import { useState } from "react";

import { CategoryDot } from "@/components/activities/category-label";
import { OccurrenceList } from "@/components/activities/occurrence-list";
import { useCurrentLocation } from "@/components/activities/use-current-location";
import { getCategory } from "@/lib/activities/category";
import { EMPTY_FILTERS } from "@/lib/activities/filters";
import { formatCount } from "@/lib/activities/format";
import { groupByDay, type OccurrenceGroup } from "@/lib/activities/occurrences";
import { getActivities } from "@/lib/api/activities";
import { cn } from "@/lib/utils";
import type { Activity, ActivityCategory } from "@/types/activity";

type Chip = "all" | "free" | ActivityCategory;

const QUICK_CATEGORIES: ActivityCategory[] = ["family", "outdoors", "arts_music"];
const MAX_ROWS = 8;

/** Real listings straight under the planner, so the page works untyped. */
export function WeekendPicks({
  activities: initialActivities,
  range,
  rangeLabel,
  weekendTotal,
  weekTotal,
}: {
  activities: Activity[];
  weekendTotal: number;
  range: { from: string; to: string };
  rangeLabel: string;
  weekTotal: number;
}) {
  const [chip, setChip] = useState<Chip>("all");
  const [activities, setActivities] = useState(initialActivities);
  const [nearMe, setNearMe] = useState(false);
  const location = useCurrentLocation();

  async function toggleNearMe() {
    if (nearMe) {
      setNearMe(false);
      setActivities(initialActivities);
      return;
    }
    const coordinates = location.coordinates ?? (await location.request());
    if (!coordinates) return;
    const page = await getActivities(
      range,
      { ...EMPTY_FILTERS, sortBy: "distance", ...coordinates },
      { limit: 50 },
    ).catch(() => undefined);
    if (!page) return;
    setActivities(page.items);
    setNearMe(true);
  }

  const visible = activities.filter(
    (activity) =>
      chip === "all" ||
      (chip === "free" ? activity.costType === "free" : activity.category === chip),
  );
  const groups = limitRows(
    groupByDay(visible, { keepOrder: nearMe }),
    MAX_ROWS,
  );

  return (
    <section
      aria-labelledby="weekend-heading"
      className="mx-auto flex max-w-[1120px] flex-col gap-2.5 px-[18px] pt-[18px] pb-6 md:gap-4 md:px-8 md:py-8"
    >
      <div className="flex items-baseline justify-between gap-4 md:items-end">
        <div className="flex flex-col gap-1">
          <h2 id="weekend-heading" className="text-lg md:text-[22px]">
            <span className="md:hidden">This weekend</span>
            <span className="hidden md:inline">Happening this weekend</span>
          </h2>
          <span className="hidden text-sm text-muted-foreground md:block">
            {rangeLabel} · {formatCount(weekendTotal)}
          </span>
        </div>
        <Link
          href="/whats-on"
          className="text-sm font-medium whitespace-nowrap text-action md:text-[15px]"
        >
          <span className="md:hidden">See all {weekTotal}</span>
          <span className="hidden md:inline">See all {weekTotal} this week →</span>
        </Link>
      </div>

      <div
        className="-mx-[18px] flex gap-2 overflow-x-auto px-[18px] [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
        aria-label="Quick filters"
      >
        <QuickChip active={chip === "all"} onClick={() => setChip("all")}>
          All
        </QuickChip>
        <QuickChip active={chip === "free"} onClick={() => setChip("free")}>
          Free
        </QuickChip>
        {QUICK_CATEGORIES.map((category) => {
          const info = getCategory(category);
          return (
            <QuickChip
              key={category}
              active={chip === category}
              onClick={() => setChip(category)}
            >
              <CategoryDot color={info.color} className="size-[7px] md:size-[7px]" />
              {info.label}
            </QuickChip>
          );
        })}
        <QuickChip
          active={nearMe}
          onClick={() => void toggleNearMe()}
          disabled={location.locating}
        >
          {location.locating ? "Finding you…" : "Near me"}
        </QuickChip>
      </div>
      {location.error ? (
        <p className="text-xs text-cancelled-foreground">{location.error}</p>
      ) : null}

      {groups.length ? (
        <OccurrenceList groups={groups} />
      ) : (
        <p className="rounded-[12px] border border-dashed border-[#C9C6BE] bg-[#FBFAF7] px-[18px] py-5 text-sm text-body">
          Nothing listed for this weekend yet.{" "}
          <Link href="/whats-on" className="font-medium">
            Browse the whole week
          </Link>
          .
        </p>
      )}
    </section>
  );
}

function limitRows(groups: OccurrenceGroup[], max: number): OccurrenceGroup[] {
  let remaining = max;
  return groups
    .map((group) => {
      const occurrences = group.occurrences.slice(0, Math.max(0, remaining));
      remaining -= occurrences.length;
      return { ...group, occurrences };
    })
    .filter((group) => group.occurrences.length > 0);
}

function QuickChip({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex shrink-0 items-center gap-[7px] rounded-full border px-3.5 py-[7px] text-[13px] whitespace-nowrap md:text-sm",
        active
          ? "border-primary bg-primary font-medium text-primary-foreground"
          : "border-line bg-card text-secondary-foreground hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}
