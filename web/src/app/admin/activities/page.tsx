import { Plus } from "lucide-react";
import Link from "next/link";

import { ActivityRowActions } from "@/components/admin/activity-row-actions";
import { ActivityStatusBadge } from "@/components/admin/activity-status-badge";
import { buttonVariants } from "@/components/ui/button";
import { getAdminActivities } from "@/lib/api/admin-activities";
import { cn } from "@/lib/utils";
import type { ActivityStatus } from "@/types/activity";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const FILTERS: Array<{ label: string; value?: ActivityStatus }> = [
  { label: "All" },
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Cancelled", value: "cancelled" },
];
const STATUS_VALUES = new Set<ActivityStatus>([
  "draft",
  "published",
  "cancelled",
]);

export default async function AdminActivitiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const raw = await searchParams;
  const statusValue = getSingle(raw.status);
  const status = STATUS_VALUES.has(statusValue as ActivityStatus)
    ? (statusValue as ActivityStatus)
    : undefined;
  const rawPage = Number(getSingle(raw.page) ?? "1");
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const activities = await getAdminActivities({ page, status, limit: 10 });

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
        {FILTERS.map((filter) => {
          const active = filter.value === status;
          const href = filter.value
            ? `/admin/activities?status=${filter.value}`
            : "/admin/activities";

          return (
            <Link
              key={filter.label}
              href={href}
              className={cn(
                "shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      <section className="mt-4 overflow-hidden rounded-xl border bg-white shadow-sm">
        {activities.items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h2 className="font-semibold">No activities found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {status
                ? `There are no ${status} activities.`
                : "Create the first activity to get started."}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(11rem,1fr)_minmax(9rem,0.8fr)_8rem_minmax(12rem,auto)] gap-4 bg-muted/60 px-5 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase lg:grid">
              <span>Activity</span>
              <span>Date</span>
              <span>Venue</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>

            {activities.items.map((activity) => (
              <article
                key={activity.id}
                className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,2fr)_minmax(11rem,1fr)_minmax(9rem,0.8fr)_8rem_minmax(12rem,auto)] lg:items-center"
              >
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{activity.title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Updated {formatDateTime(activity.updatedAt)}
                  </p>
                </div>
                <div className="text-sm">
                  <span className="mr-2 text-xs font-semibold text-muted-foreground uppercase lg:hidden">
                    Date
                  </span>
                  {activity.dates[0]
                    ? formatDateTime(activity.dates[0].startsAt)
                    : "No date"}
                  {activity.dates.length > 1 ? (
                    <span className="ml-1 text-xs text-muted-foreground">
                      +{activity.dates.length - 1} more
                    </span>
                  ) : null}
                </div>
                <div className="truncate text-sm">
                  <span className="mr-2 text-xs font-semibold text-muted-foreground uppercase lg:hidden">
                    Venue
                  </span>
                  {activity.venue?.name ?? "No venue"}
                </div>
                <div>
                  <ActivityStatusBadge status={activity.status} />
                </div>
                <ActivityRowActions
                  id={activity.id}
                  status={activity.status}
                  title={activity.title}
                />
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="mt-5 flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>
          {activities.total} {activities.total === 1 ? "activity" : "activities"}
        </p>
        {activities.totalPages > 1 ? (
          <nav aria-label="Activity list pages" className="flex items-center gap-2">
            <PageLink
              disabled={page <= 1}
              href={makePageHref(status, page - 1)}
            >
              Previous
            </PageLink>
            <span>
              Page {page} of {activities.totalPages}
            </span>
            <PageLink
              disabled={page >= activities.totalPages}
              href={makePageHref(status, page + 1)}
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
  href,
}: {
  children: React.ReactNode;
  disabled: boolean;
  href: string;
}) {
  if (disabled) {
    return (
      <span className="rounded-md border px-3 py-1.5 opacity-40">{children}</span>
    );
  }

  return (
    <Link className="rounded-md border bg-white px-3 py-1.5 hover:bg-muted" href={href}>
      {children}
    </Link>
  );
}

function makePageHref(status: ActivityStatus | undefined, page: number) {
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set("status", status);
  return `/admin/activities?${params}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Pacific/Auckland",
  }).format(new Date(value));
}

function getSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
