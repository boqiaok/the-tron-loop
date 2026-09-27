"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  ADMIN_ACTIVITY_SCHEDULE_OPTIONS,
  ADMIN_ACTIVITY_SORT_OPTIONS,
  ADMIN_ACTIVITY_TIMING_OPTIONS,
  makeAdminActivityListHref,
  type AdminActivityListQuery,
  type AdminActivitySchedule,
  type AdminActivitySort,
  type AdminActivityTiming,
} from "@/lib/activities/admin-list-query";
import type { ActivitySource } from "@/lib/api/admin-activities";
import { cn } from "@/lib/utils";

const controlClassName =
  "h-10 rounded-md border bg-white px-3 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/20";

export function ActivityListFilters({
  query,
  sources,
}: {
  query: AdminActivityListQuery;
  sources: ActivitySource[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.q ?? "");

  function apply(changes: Partial<AdminActivityListQuery>) {
    startTransition(() => {
      router.push(makeAdminActivityListHref(query, changes));
    });
  }

  return (
    <div
      className={cn(
        "mt-4 flex flex-wrap items-center gap-2 transition-opacity",
        pending && "opacity-60",
      )}
    >
      <form
        role="search"
        className="relative min-w-60 flex-1"
        onSubmit={(event) => {
          event.preventDefault();
          apply({ q: search.trim() || undefined });
        }}
      >
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={search}
          maxLength={100}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search titles…"
          aria-label="Search activity titles"
          className={cn(controlClassName, "w-full pr-9 pl-9")}
        />
        {query.q ? (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted"
            onClick={() => {
              setSearch("");
              apply({ q: undefined });
            }}
          >
            <X className="size-4" />
          </button>
        ) : null}
      </form>

      <select
        aria-label="Filter by source"
        value={query.source ?? ""}
        onChange={(event) => apply({ source: event.target.value || undefined })}
        className={controlClassName}
      >
        <option value="">All sources</option>
        <option value="manual">Added manually</option>
        {sources.map((source) => (
          <option key={source.id} value={source.id}>
            {source.name}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by date"
        value={query.timing}
        onChange={(event) =>
          apply({ timing: event.target.value as AdminActivityTiming })
        }
        className={controlClassName}
      >
        {ADMIN_ACTIVITY_TIMING_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by schedule"
        value={query.schedule}
        onChange={(event) =>
          apply({ schedule: event.target.value as AdminActivitySchedule })
        }
        className={controlClassName}
      >
        {ADMIN_ACTIVITY_SCHEDULE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Sort activities"
        value={query.sort}
        onChange={(event) =>
          apply({ sort: event.target.value as AdminActivitySort })
        }
        className={controlClassName}
      >
        {ADMIN_ACTIVITY_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
