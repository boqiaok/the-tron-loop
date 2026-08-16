"use client";

import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ActivityList } from "@/components/activities/activity-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getActivities, type ActivityRange } from "@/lib/api/activities";
import { cn } from "@/lib/utils";
import type {
  ActivityFilterOptions,
  ActivityFilters,
  PaginatedActivities,
} from "@/types/activity";

interface ActivityExplorerProps {
  initialActivities: PaginatedActivities;
  initialFilters: ActivityFilters;
  options: ActivityFilterOptions;
  pathname: string;
  range: ActivityRange;
}

type ActiveChip = "all" | "free" | `tag:${string}`;

export function ActivityExplorer({
  initialActivities,
  initialFilters,
  options,
  pathname,
  range,
}: ActivityExplorerProps) {
  const [activities, setActivities] = useState(initialActivities);
  const [filters, setFilters] = useState(initialFilters);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebouncedValue(filters.q ?? "", 300);
  const isInitialRender = useRef(true);
  const requestFilters = useMemo<ActivityFilters>(
    () => ({
      q: debouncedQuery || undefined,
      sort: filters.sort,
      costType: filters.costType,
      tag: filters.tag,
      suburb: filters.suburb,
      page: filters.page,
    }),
    [
      debouncedQuery,
      filters.costType,
      filters.page,
      filters.sort,
      filters.suburb,
      filters.tag,
    ],
  );

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(undefined);
    updateBrowserUrl(pathname, requestFilters);
    void getActivities(range, requestFilters, controller.signal)
      .then(setActivities)
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        setError("Activities could not be updated. Please try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [pathname, range, requestFilters]);

  const activeChip = getActiveChip(filters);

  function selectChip(chip: ActiveChip) {
    setFilters((current) => ({
      ...current,
      costType: chip === "free" ? "free" : undefined,
      tag: chip.startsWith("tag:") ? chip.slice(4) : undefined,
      page: 1,
    }));
  }

  function changePage(page: number) {
    setFilters((current) => ({ ...current, page }));
  }

  return (
    <div className="grid gap-3">
      <section
        aria-label="Activity filters"
        className="grid gap-3 rounded-lg border bg-card p-3 lg:grid-cols-[minmax(15rem,18rem)_1fr_auto] lg:items-center"
      >
        <label className="flex h-10 items-center gap-2 rounded-md border bg-background px-3 focus-within:ring-2 focus-within:ring-ring/40">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <span className="sr-only">Search activities</span>
          <input
            type="search"
            value={filters.q ?? ""}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                q: event.target.value || undefined,
                page: 1,
              }))
            }
            placeholder="Search activities"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:px-0 lg:pb-0"
          aria-label="Activity categories"
        >
          <FilterChip
            active={activeChip === "all"}
            onClick={() => selectChip("all")}
          >
            All
          </FilterChip>
          <FilterChip
            active={activeChip === "free"}
            onClick={() => selectChip("free")}
          >
            Free
          </FilterChip>
          {options.tags.map((tag) => (
            <FilterChip
              key={tag.slug}
              active={activeChip === `tag:${tag.slug}`}
              onClick={() => selectChip(`tag:${tag.slug}`)}
            >
              {tag.name}
            </FilterChip>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full justify-between lg:w-auto"
          onClick={() =>
            setFilters((current) => ({
              ...current,
              sort: current.sort === "asc" ? "desc" : "asc",
              page: 1,
            }))
          }
          aria-label={`Sort by date and time ${filters.sort === "asc" ? "descending" : "ascending"}`}
        >
          Date &amp; time
          {filters.sort === "asc" ? <ArrowDown /> : <ArrowUp />}
        </Button>
      </section>

      <aside className="flex min-h-10 items-center gap-3 rounded-md border bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
        <span className="grid size-5 shrink-0 place-items-center rounded-full border border-foreground text-[0.7rem] font-semibold text-foreground">
          i
        </span>
        <p>
          Times and details may change. Please confirm with the original
          organiser before attending.
        </p>
      </aside>

      <section className="grid gap-3" aria-labelledby="activity-results">
        <h2 id="activity-results" className="sr-only">
          Activities
        </h2>
        <p
          className="h-4 text-right text-xs text-muted-foreground"
          aria-live="polite"
        >
          {isLoading
            ? "Updating…"
            : `${activities.total} ${activities.total === 1 ? "result" : "results"}`}
        </p>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to update activities</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div
            className={cn(
              "transition-opacity duration-150",
              isLoading && "opacity-45",
            )}
          >
            <ActivityList activities={activities.items} />
          </div>
        )}
      </section>

      {activities.totalPages > 1 && (
        <nav
          aria-label="Activity pages"
          className="flex items-center justify-center gap-3"
        >
          <Button
            type="button"
            variant="outline"
            disabled={filters.page <= 1 || isLoading}
            onClick={() => changePage(filters.page - 1)}
          >
            <ChevronLeft data-icon="inline-start" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {filters.page} of {activities.totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={filters.page >= activities.totalPages || isLoading}
            onClick={() => changePage(filters.page + 1)}
          >
            Next
            <ChevronRight data-icon="inline-end" />
          </Button>
        </nav>
      )}
    </div>
  );
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

function getActiveChip(filters: ActivityFilters): ActiveChip {
  if (filters.costType === "free") return "free";
  if (filters.tag) return `tag:${filters.tag}`;
  return "all";
}

function updateBrowserUrl(pathname: string, filters: ActivityFilters): void {
  const searchParams = new URLSearchParams();

  if (filters.q) searchParams.set("q", filters.q);
  if (filters.costType) searchParams.set("costType", filters.costType);
  if (filters.tag) searchParams.set("tag", filters.tag);
  if (filters.suburb) searchParams.set("suburb", filters.suburb);
  if (filters.sort === "desc") searchParams.set("sort", "desc");
  if (filters.page > 1) searchParams.set("page", String(filters.page));

  const query = searchParams.toString();
  window.history.replaceState(
    null,
    "",
    query ? `${pathname}?${query}` : pathname,
  );
}

function useDebouncedValue(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return debouncedValue;
}
