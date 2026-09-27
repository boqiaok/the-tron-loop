"use client";

import { LoaderCircle, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ActivityRowActions } from "@/components/admin/activity-row-actions";
import { ActivityStatusBadge } from "@/components/admin/activity-status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { getNextDate } from "@/lib/activities/format";
import { REJECTION_REASON_LABELS } from "@/lib/activities/rejection-reasons";
import {
  publishAdminActivities,
  type AdminActivity,
} from "@/lib/api/admin-activities";
import { cn } from "@/lib/utils";

const GRID_COLUMNS =
  "lg:grid-cols-[1.5rem_minmax(0,2fr)_minmax(11rem,1fr)_minmax(9rem,0.8fr)_8rem_minmax(12rem,auto)]";

interface PublishSummary {
  published: number;
  skipped: Array<{ id: string; title: string; reason: string }>;
}

export function ActivityTable({ activities }: { activities: AdminActivity[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PublishSummary | null>(null);

  const drafts = activities.filter((activity) => activity.status === "draft");
  // Only drafts on the current page can be selected; stale IDs from a previous
  // page or filter are dropped here rather than published by accident.
  const selectedIds = drafts
    .filter((activity) => selected.has(activity.id))
    .map((activity) => activity.id);
  const allSelected = drafts.length > 0 && selectedIds.length === drafts.length;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function publishSelected() {
    setPublishing(true);
    setError(null);
    try {
      const result = await publishAdminActivities(selectedIds);
      const titleById = new Map(activities.map(({ id, title }) => [id, title]));
      setSummary({
        published: result.published.length,
        skipped: result.skipped.map(({ id, reason }) => ({
          id,
          title: titleById.get(id) ?? id,
          reason,
        })),
      });
      setSelected(new Set());
      setConfirming(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Publishing failed.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <>
      {summary ? (
        <Alert
          className="mt-4"
          variant={summary.skipped.length ? "destructive" : "default"}
        >
          <AlertTitle className="flex items-center justify-between gap-4">
            <span>
              Published {summary.published}{" "}
              {summary.published === 1 ? "activity" : "activities"}
              {summary.skipped.length
                ? `, skipped ${summary.skipped.length}`
                : ""}
              .
            </span>
            <button
              type="button"
              aria-label="Dismiss"
              className="rounded p-1 hover:bg-muted"
              onClick={() => setSummary(null)}
            >
              <X className="size-4" />
            </button>
          </AlertTitle>
          {summary.skipped.length ? (
            <AlertDescription>
              <ul className="mt-1 list-disc pl-5">
                {summary.skipped.map((item) => (
                  <li key={item.id}>
                    <span className="font-medium">{item.title}</span>:{" "}
                    {item.reason}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          ) : null}
        </Alert>
      ) : null}

      <section className="mt-4 overflow-hidden rounded-xl border bg-white shadow-sm">
        {selectedIds.length ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-primary/5 px-5 py-3">
            <p className="text-sm font-medium">
              {selectedIds.length} {selectedIds.length === 1 ? "draft" : "drafts"}{" "}
              selected
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelected(new Set())}
              >
                Clear
              </Button>
              <Button size="sm" onClick={() => setConfirming(true)}>
                <Send />
                Publish selected
              </Button>
            </div>
          </div>
        ) : null}

        <div className="divide-y">
          <div
            className={cn(
              "hidden gap-4 bg-muted/60 px-5 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase lg:grid lg:items-center",
              GRID_COLUMNS,
            )}
          >
            <input
              type="checkbox"
              aria-label="Select all drafts on this page"
              className="size-4 accent-[var(--primary)]"
              checked={allSelected}
              disabled={drafts.length === 0}
              onChange={() =>
                setSelected(
                  allSelected ? new Set() : new Set(drafts.map(({ id }) => id)),
                )
              }
            />
            <span>Activity</span>
            <span>Date</span>
            <span>Venue</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          {activities.map((activity) => (
            <article
              key={activity.id}
              className={cn(
                "grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 gap-y-4 px-5 py-5 lg:items-center lg:gap-4",
                GRID_COLUMNS,
                selected.has(activity.id) && "bg-primary/5",
              )}
            >
              <div className="pt-1 lg:pt-0">
                {activity.status === "draft" ? (
                  <input
                    type="checkbox"
                    aria-label={`Select ${activity.title}`}
                    className="size-4 accent-[var(--primary)]"
                    checked={selected.has(activity.id)}
                    onChange={() => toggle(activity.id)}
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <h2 className="truncate font-semibold">{activity.title}</h2>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {activity.source?.name ?? "Added manually"} ·{" "}
                  {activity.rejectedAt && activity.rejectionReason
                    ? `Rejected ${formatDateTime(activity.rejectedAt)} as ${REJECTION_REASON_LABELS[activity.rejectionReason].toLowerCase()}`
                    : `Updated ${formatDateTime(activity.updatedAt)}`}
                </p>
              </div>
              <div className="col-start-2 text-sm lg:col-start-auto">
                <span className="mr-2 text-xs font-semibold text-muted-foreground uppercase lg:hidden">
                  Date
                </span>
                {formatNextDate(activity)}
                {activity.dates.length > 1 ? (
                  <span className="ml-1 text-xs text-muted-foreground">
                    +{activity.dates.length - 1} more
                  </span>
                ) : null}
              </div>
              <div className="col-start-2 truncate text-sm lg:col-start-auto">
                <span className="mr-2 text-xs font-semibold text-muted-foreground uppercase lg:hidden">
                  Venue
                </span>
                {activity.venue?.name ?? "No venue"}
              </div>
              <div className="col-start-2 lg:col-start-auto">
                <ActivityStatusBadge status={activity.status} />
              </div>
              <div className="col-start-2 lg:col-start-auto">
                <ActivityRowActions
                  id={activity.id}
                  status={activity.status}
                  title={activity.title}
                  imported={activity.source !== null}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <AlertDialog
        open={confirming}
        onOpenChange={(open) => {
          if (!open && !publishing) {
            setConfirming(false);
            setError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <span
              className="grid size-11 place-items-center rounded-full bg-emerald-100 text-emerald-700"
              aria-hidden="true"
            >
              <Send className="size-5" />
            </span>
            <AlertDialogTitle>
              Publish {selectedIds.length}{" "}
              {selectedIds.length === 1 ? "activity" : "activities"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The selected drafts will immediately appear in the public weekly
              guide. Drafts without a date will be skipped.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error ? (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={publishing}>Keep as drafts</AlertDialogCancel>
            <Button size="lg" disabled={publishing} onClick={publishSelected}>
              {publishing ? <LoaderCircle className="animate-spin" /> : null}
              {publishing ? "Publishing…" : "Publish activities"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Shows the next date that has not ended, matching the "starts" sort. */
function formatNextDate(activity: AdminActivity) {
  const date = getNextDate(activity);
  return date ? formatDateTime(date.startsAt) : "No date";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Pacific/Auckland",
  }).format(new Date(value));
}
