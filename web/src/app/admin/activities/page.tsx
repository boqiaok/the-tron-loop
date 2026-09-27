import { Plus } from "lucide-react";
import Link from "next/link";

import { ActivityListFilters } from "@/components/admin/activity-list-filters";
import { ActivityTable } from "@/components/admin/activity-table";
import { buttonVariants } from "@/components/ui/button";
import {
  makeAdminActivityListHref,
  parseAdminActivityListQuery,
  type AdminActivityListQuery,
} from "@/lib/activities/admin-list-query";
import { getAdminActivities, getAdminSources } from "@/lib/api/admin-activities";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { cn } from "@/lib/utils";
import type { ActivityStatus } from "@/types/activity";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATUS_TABS: Array<{ label: string; value?: ActivityStatus }> = [
  { label: "All" },
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Rejected", value: "rejected" },
];

export default async function AdminActivitiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { context } = await requireAdminSession();
  const query = parseAdminActivityListQuery(await searchParams);
  const [activities, sources] = await Promise.all([
    getAdminActivities(query, PAGE_SIZE, context),
    getAdminSources(context),
  ]);
  const { statusCounts } = activities;
  // Rejected activities are left out of "All", matching the API.
  const allCount =
    statusCounts.draft + statusCounts.published + statusCounts.cancelled;
  const isFiltered = Boolean(
    query.source || query.q || query.timing !== "all" || query.schedule !== "all",
  );

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.14em] text-[var(--gold)] uppercase">
            Administration
          </p>
          <h1 className="mt-1 font-heading text-4xl text-primary">
            Activities
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create, review and publish activity listings.
          </p>
        </div>
        <Link
          href="/admin/activities/new"
          className={cn(buttonVariants({ size: "lg" }))}
        >
          <Plus />
          New activity
        </Link>
      </div>

      <nav
        aria-label="Filter activities by status"
        className="mt-7 flex gap-1 overflow-x-auto rounded-lg border bg-white p-1"
      >
        {STATUS_TABS.map((tab) => {
          const active = tab.value === query.status;
          const count = tab.value ? statusCounts[tab.value] : allCount;

          return (
            <Link
              key={tab.label}
              href={makeAdminActivityListHref(query, { status: tab.value })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs tabular-nums",
                  active ? "bg-white/20" : "bg-muted",
                )}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      <ActivityListFilters key={query.q ?? ""} query={query} sources={sources} />

      {activities.items.length === 0 ? (
        <section className="mt-4 rounded-xl border bg-white px-6 py-16 text-center shadow-sm">
          <h2 className="font-semibold">No activities found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isFiltered || query.status
              ? "No activities match these filters."
              : "Create the first activity to get started."}
          </p>
          {isFiltered ? (
            <Link
              href={makeAdminActivityListHref(query, {
                source: undefined,
                q: undefined,
                timing: "all",
                schedule: "all",
              })}
              className={cn(buttonVariants({ variant: "outline" }), "mt-4")}
            >
              Clear filters
            </Link>
          ) : null}
        </section>
      ) : (
        // Remount on navigation so a selection never carries across pages.
        <ActivityTable
          key={makeAdminActivityListHref(query, { page: query.page })}
          activities={activities.items}
        />
      )}

      <div className="mt-5 flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>
          {activities.total} {activities.total === 1 ? "activity" : "activities"}
        </p>
        {activities.totalPages > 1 ? (
          <nav aria-label="Activity list pages" className="flex items-center gap-2">
            <PageLink query={query} page={query.page - 1} disabled={query.page <= 1}>
              Previous
            </PageLink>
            <span>
              Page {query.page} of {activities.totalPages}
            </span>
            <PageLink
              query={query}
              page={query.page + 1}
              disabled={query.page >= activities.totalPages}
            >
              Next
            </PageLink>
          </nav>
        ) : null}
      </div>
    </main>
  );
}

function PageLink({
  children,
  disabled,
  page,
  query,
}: {
  children: React.ReactNode;
  disabled: boolean;
  page: number;
  query: AdminActivityListQuery;
}) {
  if (disabled) {
    return (
      <span className="rounded-md border px-3 py-1.5 opacity-40">{children}</span>
    );
  }

  return (
    <Link
      className="rounded-md border bg-white px-3 py-1.5 hover:bg-muted"
      href={makeAdminActivityListHref(query, { page })}
    >
      {children}
    </Link>
  );
}
