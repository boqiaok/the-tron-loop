"use client";

import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { OccurrenceList } from "@/components/activities/occurrence-list";
import { useCurrentLocation } from "@/components/activities/use-current-location";
import { FilterRail } from "@/components/whats-on/filter-rail";
import { getCategory } from "@/lib/activities/category";
import {
  countActiveFilters,
  toSearchParams,
  WHATS_ON_SCOPES,
  type WhatsOnScope,
} from "@/lib/activities/filters";
import { formatCount, formatShortRange } from "@/lib/activities/format";
import { groupByDay, groupByWeekday } from "@/lib/activities/occurrences";
import type { WeekTarget } from "@/lib/activities/whats-on-week";
import { getActivities, PAGE_SIZE } from "@/lib/api/activities";
import type { WeekRange } from "@/lib/dates/week-range";
import { cn } from "@/lib/utils";
import type {
  Activity,
  ActivityFilterOptions,
  ActivityFilters,
  PaginatedActivities,
} from "@/types/activity";

type WhatsOnData =
  | {
      scope: Exclude<WhatsOnScope, "regular">;
      week: string;
      range: WeekRange;
      adjacent: { previous?: WeekTarget; next?: WeekTarget };
      initialPage: PaginatedActivities;
      options: ActivityFilterOptions;
    }
  | { scope: "regular"; activities: Activity[] };

export function WhatsOnExplorer({
  data,
  initialFilters,
}: {
  data: WhatsOnData;
  initialFilters: ActivityFilters;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(
    data.scope === "regular" ? undefined : data.initialPage,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const location = useCurrentLocation();
  const debouncedQuery = useDebouncedValue(filters.q ?? "", 300);
  const week = data.scope === "regular" ? undefined : data.week;
  const range = data.scope === "regular" ? undefined : data.range;

  const { categories, costType, includeCancelled, sortBy, suburb, when } =
    filters;
  const coordinates = location.coordinates;
  const requestFilters = useMemo<ActivityFilters>(
    () => ({
      q: debouncedQuery || undefined,
      categories,
      costType,
      includeCancelled,
      suburb,
      when,
      latitude: coordinates?.latitude,
      longitude: coordinates?.longitude,
      sortBy: coordinates ? sortBy : "date",
      page: 1,
    }),
    [
      categories,
      coordinates,
      costType,
      debouncedQuery,
      includeCancelled,
      sortBy,
      suburb,
      when,
    ],
  );

  // The page is "loading" until the result for the current filters arrives.
  const requestKey = JSON.stringify(requestFilters);
  const [loaded, setLoaded] = useState<{ key: string; error?: string }>({
    key: requestKey,
  });
  const loading = Boolean(range) && loaded.key !== requestKey;
  const error = loaded.key === requestKey ? (loaded.error ?? moreError) : undefined;

  useEffect(() => {
    const params = toSearchParams(data.scope, week, requestFilters).toString();
    window.history.replaceState(null, "", params ? `?${params}` : "?");
  }, [data.scope, requestFilters, week]);

  useEffect(() => {
    if (!range || loaded.key === requestKey) return;
    const controller = new AbortController();
    getActivities(range, requestFilters, { signal: controller.signal })
      .then((next) => {
        setPage(next);
        setLoaded({ key: requestKey });
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError")
          return;
        setLoaded({
          key: requestKey,
          error: "Activities could not be updated. Please try again.",
        });
      });
    return () => controller.abort();
  }, [loaded.key, range, requestFilters, requestKey]);

  function update(patch: Partial<ActivityFilters>) {
    setFilters((current) => ({ ...current, ...patch, page: 1 }));
  }

  async function loadMore() {
    if (!range || !page) return;
    setLoadingMore(true);
    setMoreError(undefined);
    try {
      const next = await getActivities(range, {
        ...requestFilters,
        page: page.page + 1,
      });
      const known = new Set(page.items.map((item) => item.id));
      setPage({
        ...next,
        items: [...page.items, ...next.items.filter((item) => !known.has(item.id))],
      });
    } catch {
      setMoreError("More activities could not be loaded. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function requestLocation() {
    const coordinates = await location.request();
    if (coordinates) update({ sortBy: "distance" });
  }

  function stopLocation() {
    location.clear();
    update({ sortBy: "date" });
  }

  const regular =
    data.scope === "regular" ? filterRegular(data.activities, filters) : [];
  const groups =
    data.scope === "regular"
      ? groupByWeekday(regular)
      : groupByDay(page?.items ?? [], {
          keepOrder: requestFilters.sortBy === "distance",
          eveningOnly: filters.when === "evening",
        });
  const total = data.scope === "regular" ? regular.length : (page?.total ?? 0);
  const shown = page?.items.length ?? 0;
  const remaining = Math.max(0, total - shown);
  const activeCount = countActiveFilters(filters);
  const summary = describeFilters(filters);
  const hrefFor = (target: { scope: WhatsOnScope; week?: string }) => {
    const params = toSearchParams(target.scope, target.week, {
      ...filters,
      when:
        filters.when === "today" && target.scope !== "this-week"
          ? undefined
          : filters.when,
    }).toString();
    return params ? `/whats-on?${params}` : "/whats-on";
  };
  const rail = (
    <FilterRail
      scope={data.scope}
      filters={filters}
      options={data.scope === "regular" ? undefined : data.options}
      onChange={update}
      location={{
        active: Boolean(location.coordinates),
        locating: location.locating,
        error: location.error,
        onUse: () => void requestLocation(),
        onStop: stopLocation,
      }}
    />
  );

  return (
    <main>
      <h1 className="sr-only">What’s on in Hamilton</h1>
      <section className="border-b bg-card">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-2.5 px-[18px] pt-3 pb-3 md:gap-4 md:px-8 md:pt-[22px] md:pb-4">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5">
            <nav
              aria-label="Time scope"
              className="-mx-[18px] flex gap-1.5 overflow-x-auto px-[18px] [scrollbar-width:none] md:mx-0 md:gap-0 md:overflow-visible md:rounded-full md:bg-secondary md:p-1 md:px-1"
            >
              {WHATS_ON_SCOPES.map((item) => {
                const active = item.value === data.scope;
                return (
                  <Link
                    key={item.value}
                    href={hrefFor({ scope: item.value })}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-full px-3.5 py-[7px] text-[13px] whitespace-nowrap hover:no-underline md:px-[18px] md:py-2 md:text-sm",
                      active
                        ? "bg-primary font-semibold text-primary-foreground hover:text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-[#E6E3DC] hover:text-secondary-foreground md:bg-transparent",
                    )}
                  >
                    <span className="md:hidden">{item.shortLabel}</span>
                    <span className="hidden md:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            {data.scope !== "regular" ? (
              <div className="flex shrink-0 items-center gap-2.5">
                <span className="text-sm text-meta">
                  {formatShortRange(data.range)}
                </span>
                <WeekArrow
                  label="Previous week"
                  href={
                    data.adjacent.previous
                      ? hrefFor(data.adjacent.previous)
                      : undefined
                  }
                >
                  ‹
                </WeekArrow>
                <WeekArrow
                  label="Next week"
                  href={
                    data.adjacent.next ? hrefFor(data.adjacent.next) : undefined
                  }
                >
                  ›
                </WeekArrow>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[11px] border border-line bg-field px-3.5 focus-within:ring-3 focus-within:ring-ring/30 md:h-11 md:gap-2.5 md:rounded-[12px] md:px-4">
              <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">Search activities</span>
              <input
                type="search"
                value={filters.q ?? ""}
                onChange={(event) => update({ q: event.target.value || undefined })}
                placeholder="Search activities, venues or suburbs"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground md:text-[15px]"
              />
            </label>
            {data.scope !== "regular" ? (
              <label className="relative hidden h-11 items-center rounded-[12px] border border-line text-sm text-secondary-foreground focus-within:ring-3 focus-within:ring-ring/30 md:flex">
                <span className="pointer-events-none absolute left-4">Sort:</span>
                <select
                  value={requestFilters.sortBy}
                  onChange={(event) => {
                    if (event.target.value === "distance" && !location.coordinates) {
                      void requestLocation();
                    } else {
                      update({ sortBy: event.target.value as "date" | "distance" });
                    }
                  }}
                  className="h-full cursor-pointer appearance-none bg-transparent pr-10 pl-[3.1rem] outline-none"
                  aria-label="Sort activities"
                >
                  <option value="date">Time</option>
                  <option value="distance">Distance</option>
                </select>
                <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3.5 size-4 text-muted-foreground" />
              </label>
            ) : null}
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="flex h-10 shrink-0 items-center gap-[7px] rounded-[11px] bg-primary px-3.5 text-sm font-semibold text-primary-foreground lg:hidden"
            >
              <SlidersHorizontal aria-hidden="true" className="size-4" />
              Filters
              {activeCount ? (
                <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-white px-[5px] text-[11px] text-primary">
                  {activeCount}
                </span>
              ) : null}
            </button>
          </div>

          <p className="text-[13px] text-meta lg:hidden" aria-live="polite">
            {loading ? "Updating…" : formatCount(total)}
            {summary ? ` · ${summary}` : ""}
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1120px] gap-6 px-[18px] pt-3.5 pb-6 md:px-8 md:pt-6 md:pb-8 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside aria-label="Filters" className="hidden lg:block">
          {rail}
        </aside>

        <section aria-label="Activities" className="flex min-w-0 flex-col gap-1.5">
          <div className="hidden items-center justify-between gap-4 pb-1.5 lg:flex">
            <p className="text-[15px] text-secondary-foreground" aria-live="polite">
              <b className="font-semibold">
                {loading ? "Updating…" : formatCount(total)}
              </b>
              {summary ? ` · ${summary}` : ""}
            </p>
            {activeCount ? (
              <button
                type="button"
                onClick={() => update(clearedFilters(filters))}
                className="text-sm font-medium text-action hover:text-action-hover hover:underline"
              >
                Clear filters
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-[12px] border border-cancelled bg-cancelled/40 px-4 py-3 text-sm text-cancelled-foreground">
              {error}
            </p>
          ) : null}

          <div className={cn("transition-opacity", loading && "opacity-50")}>
            {groups.length ? (
              <OccurrenceList groups={groups} recurring={data.scope === "regular"} />
            ) : (
              <EmptyState
                filtered={activeCount > 0 || Boolean(filters.q)}
                onClear={() => update({ ...clearedFilters(filters), q: undefined })}
              />
            )}
          </div>

          {data.scope !== "regular" && remaining > 0 && !loading ? (
            <div className="flex justify-center pt-3.5">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="rounded-full border border-primary px-6 py-[11px] text-[15px] font-semibold whitespace-nowrap hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
              >
                {loadingMore
                  ? "Loading…"
                  : `Show ${Math.min(remaining, PAGE_SIZE)} more`}
              </button>
            </div>
          ) : null}

          <p className="pt-4 text-xs leading-normal text-muted-foreground">
            Times and details can change. Confirm with the organiser before you
            go.
          </p>
        </section>
      </div>

      {sheetOpen ? (
        <FilterSheet
          onClose={() => setSheetOpen(false)}
          resultLabel={loading ? "Updating…" : `Show ${formatCount(total)}`}
          onClear={activeCount ? () => update(clearedFilters(filters)) : undefined}
        >
          {rail}
        </FilterSheet>
      ) : null}
    </main>
  );
}

function WeekArrow({
  label,
  href,
  children,
}: {
  label: string;
  href?: string;
  children: React.ReactNode;
}) {
  const className =
    "grid size-[34px] place-items-center rounded-[9px] border border-line text-[15px] text-body hover:no-underline";
  return href ? (
    <Link href={href} aria-label={label} className={cn(className, "hover:bg-secondary hover:text-body")}>
      {children}
    </Link>
  ) : (
    <span aria-disabled="true" aria-label={label} className={cn(className, "opacity-35")}>
      {children}
    </span>
  );
}

function FilterSheet({
  onClose,
  onClear,
  resultLabel,
  children,
}: {
  onClose: () => void;
  onClear?: () => void;
  resultLabel: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Filters"
      className="fixed inset-0 z-50 flex items-end bg-[rgba(20,22,26,0.32)] lg:hidden"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="flex max-h-[85vh] w-full flex-col rounded-t-[20px] bg-card">
        <div className="flex items-center justify-between border-b px-[18px] py-3.5">
          <span className="text-base font-semibold">Filters</span>
          <button
            type="button"
            aria-label="Close filters"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-body hover:bg-secondary"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-[18px] py-5">{children}</div>
        <div className="flex gap-2 border-t px-[18px] py-3">
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="rounded-full border border-line px-4 py-3 text-sm font-medium text-secondary-foreground"
            >
              Clear
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full bg-primary px-4 py-3 text-[15px] font-semibold text-primary-foreground"
          >
            {resultLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  filtered,
  onClear,
}: {
  filtered: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-[12px] border border-dashed border-[#C9C6BE] bg-[#FBFAF7] px-[18px] py-5">
      <p className="text-[15px] font-semibold">
        {filtered ? "Nothing matches these filters" : "Nothing listed yet"}
      </p>
      <p className="text-sm text-body">
        {filtered
          ? "Try removing a filter or searching for something broader."
          : "Activities appear here as soon as organisers publish them."}
      </p>
      {filtered ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-1 rounded-full border border-primary px-4 py-2 text-sm font-semibold"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}

function clearedFilters(filters: ActivityFilters): Partial<ActivityFilters> {
  return {
    categories: [],
    costType: undefined,
    when: undefined,
    suburb: undefined,
    includeCancelled: filters.includeCancelled,
  };
}

function describeFilters(filters: ActivityFilters): string {
  return [
    ...filters.categories.map((category) => getCategory(category).label),
    filters.costType === "free" ? "Free" : filters.costType === "paid" ? "Paid" : null,
    filters.when === "today"
      ? "Today"
      : filters.when === "weekend"
        ? "Weekend"
        : filters.when === "evening"
          ? "Evenings"
          : null,
    filters.suburb,
  ]
    .filter(Boolean)
    .join(", ");
}

function filterRegular(activities: Activity[], filters: ActivityFilters) {
  const query = filters.q?.toLowerCase();
  return activities.filter(
    (activity) =>
      (!filters.categories.length ||
        filters.categories.includes(activity.category)) &&
      (!filters.costType || activity.costType === filters.costType) &&
      (!query ||
        [
          activity.title,
          activity.summary,
          activity.description,
          activity.venue?.name,
          activity.venue?.suburb,
          ...activity.tags.map((tag) => tag.name),
        ].some((value) => value?.toLowerCase().includes(query))),
  );
}

function useDebouncedValue(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);
  return debounced;
}
