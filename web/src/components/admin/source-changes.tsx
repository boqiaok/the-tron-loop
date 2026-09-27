"use client";

import { ExternalLink, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatDayLabel, formatTime } from "@/lib/activities/format";
import { cancelAdminActivity } from "@/lib/api/admin-activities";
import { acceptAdminSourceChanges } from "@/lib/api/admin-source-changes";
import { cn } from "@/lib/utils";
import type { ChangedActivity, SourceChange } from "@/types/source-change";

export function SourceChanges({ items }: { items: ChangedActivity[] }) {
  if (!items.length) return null;

  return (
    <section className="mt-8" aria-labelledby="source-changes">
      <h2 id="source-changes" className="flex items-center gap-3">
        <span className="font-heading text-2xl text-primary">
          Changed at source
        </span>
        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 tabular-nums">
          {items.length}
        </span>
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        These are live on the public site, but their source has changed since
        they were published. New dates are added automatically; everything
        below needs an editor. Edit the listing if needed, then mark it as
        checked.
      </p>
      <ul className="mt-3 divide-y overflow-hidden rounded-xl border bg-white shadow-sm">
        {items.map((item) => (
          <ChangedRow key={item.activity.id} item={item} />
        ))}
      </ul>
    </section>
  );
}

function ChangedRow({ item }: { item: ChangedActivity }) {
  const router = useRouter();
  const [pending, setPending] = useState<"accept" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { activity, changes } = item;

  async function run(action: "accept" | "cancel") {
    setPending(action);
    setError(null);
    try {
      if (action === "cancel") await cancelAdminActivity(activity.id);
      else await acceptAdminSourceChanges(activity.id);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The action failed.");
    } finally {
      setPending(null);
    }
  }

  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            href={`/admin/activities/${activity.id}/edit`}
            className="text-sm font-semibold text-foreground hover:underline"
          >
            {activity.title}
          </Link>
          {activity.sourceUrl ? (
            <a
              href={activity.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[var(--link)] hover:underline"
            >
              Original
              <ExternalLink className="size-3" />
            </a>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {activity.source?.name}
          </span>
        </div>
        <ul className="flex flex-col gap-1 text-sm">
          {changes.map((change) => (
            <li
              key={change.kind}
              className={cn(
                change.kind === "cancelled"
                  ? "font-medium text-destructive"
                  : "text-foreground",
              )}
            >
              {describeChange(change)}
            </li>
          ))}
        </ul>
        {error ? (
          <Alert variant="destructive" className="mt-1">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Link
          href={`/admin/activities/${activity.id}/edit`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Edit
        </Link>
        {suggestsCancelling(item) ? (
          <Button
            size="sm"
            variant="destructive"
            disabled={pending !== null}
            onClick={() => run("cancel")}
          >
            {pending === "cancel" ? (
              <LoaderCircle className="animate-spin" />
            ) : null}
            Mark cancelled
          </Button>
        ) : null}
        <Button
          size="sm"
          disabled={pending !== null}
          onClick={() => run("accept")}
        >
          {pending === "accept" ? <LoaderCircle className="animate-spin" /> : null}
          Mark as checked
        </Button>
      </div>
    </li>
  );
}

function describeChange(change: SourceChange): string {
  switch (change.kind) {
    case "cancelled":
      return "The source marks this activity as cancelled.";
    case "dates_removed":
      return `No longer listed on ${change.dates
        .map((date) => `${formatDayLabel(date)} ${formatTime(date)}`)
        .join(", ")}.`;
    case "venue":
      return `Venue: ${change.before ?? "none"} → ${change.after ?? "none"}`;
    case "title":
      return `Title: ${change.before} → ${change.after}`;
    case "cost":
      return `Cost: ${change.before} → ${change.after}`;
  }
}

/** Cancelled at source, or every upcoming date is gone. */
function suggestsCancelling({ activity, changes }: ChangedActivity): boolean {
  if (changes.some(({ kind }) => kind === "cancelled")) return true;
  const removed = new Set(
    changes
      .filter(({ kind }) => kind === "dates_removed")
      .flatMap(({ dates }) => dates.map((date) => Date.parse(date))),
  );
  const upcoming = activity.dates
    .map(({ startsAt }) => Date.parse(startsAt))
    .filter((time) => time >= Date.now());
  return upcoming.length > 0 && upcoming.every((time) => removed.has(time));
}
