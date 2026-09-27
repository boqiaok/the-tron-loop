"use client";

import {
  CircleSlash,
  ExternalLink,
  LoaderCircle,
  Send,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
import {
  formatDayLabel,
  formatTime,
  formatVenue,
  getCostLabel,
  getNextDate,
} from "@/lib/activities/format";
import { REJECTION_REASON_LABELS } from "@/lib/activities/rejection-reasons";
import {
  publishAdminActivities,
  rejectAdminActivities,
} from "@/lib/api/admin-activities";
import { cn } from "@/lib/utils";
import type { RejectionReason } from "@/types/activity";
import type {
  ActivityReview,
  ActivityReviewItem,
  ReviewGroup,
  ReviewReason,
} from "@/types/activity-review";

type Action = "publish" | "reject";

const GROUPS: Array<{
  group: ReviewGroup;
  title: string;
  description: string;
  actions: Action[];
  /** Everything in the group starts ticked for its first action. */
  preselected: boolean;
}> = [
  {
    group: "recommended",
    title: "Ready to publish",
    description:
      "Nothing here needs a closer look. Untick anything you disagree with, then publish.",
    actions: ["publish"],
    preselected: true,
  },
  {
    group: "review",
    title: "Worth a look",
    description:
      "Each of these needs an editor's judgement. Publish the ones that suit families and the community, and reject the rest as not suitable.",
    actions: ["publish", "reject"],
    preselected: false,
  },
  {
    group: "skip",
    title: "Suggested to skip",
    description:
      "Rejecting keeps them off the public site and out of later imports. Each is rejected with the reason shown.",
    actions: ["reject"],
    preselected: true,
  },
];

type Tone = "signal" | "risk" | "skip";

const REASONS: Record<ReviewReason, { label: string; tone: Tone }> = {
  trusted_source: { label: "Trusted source", tone: "signal" },
  previously_published: { label: "Published before", tone: "signal" },
  one_off: { label: "One-off", tone: "signal" },
  short_run: { label: "Short run", tone: "signal" },
  adult: { label: "Adults or nightlife", tone: "risk" },
  wellness: { label: "Wellness or spiritual", tone: "risk" },
  business: { label: "Business or training", tone: "risk" },
  cost_unknown: { label: "Cost unknown", tone: "risk" },
  unfamiliar_regular: { label: "Unfamiliar weekly regular", tone: "risk" },
  unverified_long_run: { label: "Unfamiliar long run", tone: "risk" },
  organizer_rejected: { label: "Organiser rejected before", tone: "risk" },
  no_signal: { label: "Nothing to go on", tone: "risk" },
  service: { label: "Service, not an outing", tone: "skip" },
  gambling: { label: "Gambling", tone: "skip" },
  sold_out: { label: "Sold out", tone: "skip" },
  duplicate: { label: "Duplicate", tone: "skip" },
  repeated_format: { label: "Same title at many venues", tone: "skip" },
  previously_rejected: { label: "Rejected before", tone: "skip" },
};

const TONE_CLASSES: Record<Tone, string> = {
  signal: "bg-emerald-50 text-emerald-800",
  risk: "bg-amber-50 text-amber-800",
  skip: "bg-slate-100 text-slate-700",
};

interface PendingAction {
  action: Action;
  items: ActivityReviewItem[];
}

interface ActionSummary {
  action: Action;
  done: number;
  skipped: Array<{ id: string; title: string; reason: string }>;
}

export function ReviewDesk({ data }: { data: ActivityReview }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        data.items
          .filter(
            (item) =>
              GROUPS.find(({ group }) => group === item.group)?.preselected,
          )
          .map((item) => item.activity.id),
      ),
  );
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ActionSummary | null>(null);

  function setMany(ids: string[], checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function runPending() {
    if (!pending) return;
    setRunning(true);
    setError(null);
    try {
      const { action, items } = pending;
      const result =
        action === "publish"
          ? await publish(items)
          : await reject(items);
      const titleById = new Map(
        items.map(({ activity }) => [activity.id, activity.title]),
      );
      setSummary({
        action,
        done: result.done.length,
        skipped: result.skipped.map(({ id, reason }) => ({
          id,
          title: titleById.get(id) ?? id,
          reason,
        })),
      });
      setMany(result.done, false);
      setPending(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The action failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      {data.endedCount ? (
        <p className="mt-6 text-sm text-muted-foreground">
          {data.endedCount} {data.endedCount === 1 ? "draft has" : "drafts have"}{" "}
          already ended and {data.endedCount === 1 ? "is" : "are"} not shown.
        </p>
      ) : null}

      {summary ? (
        <Alert
          className="mt-6"
          variant={summary.skipped.length ? "destructive" : "default"}
        >
          <AlertTitle className="flex items-center justify-between gap-4">
            <span>
              {summary.action === "publish" ? "Published" : "Rejected"}{" "}
              {summary.done} {summary.done === 1 ? "activity" : "activities"}
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

      {data.items.length ? (
        GROUPS.map((config) => (
          <ReviewSection
            key={config.group}
            {...config}
            items={data.items.filter((item) => item.group === config.group)}
            selected={selected}
            onSelect={setMany}
            onAction={(action, items) => {
              setError(null);
              setPending({ action, items });
            }}
          />
        ))
      ) : (
        <section className="mt-6 rounded-xl border bg-white px-6 py-16 text-center shadow-sm">
          <h2 className="font-semibold">No drafts to review</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            New drafts appear here after the next import.
          </p>
        </section>
      )}

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !running) {
            setPending(null);
            setError(null);
          }
        }}
      >
        {pending ? (
          <AlertDialogContent>
            <AlertDialogHeader>
              <span
                className={cn(
                  "grid size-11 place-items-center rounded-full",
                  pending.action === "publish"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-destructive/10 text-destructive",
                )}
                aria-hidden="true"
              >
                {pending.action === "publish" ? (
                  <Send className="size-5" />
                ) : (
                  <CircleSlash className="size-5" />
                )}
              </span>
              <AlertDialogTitle>
                {pending.action === "publish" ? "Publish" : "Reject"}{" "}
                {pending.items.length}{" "}
                {pending.items.length === 1 ? "activity" : "activities"}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pending.action === "publish"
                  ? "The selected drafts will immediately appear on the public site."
                  : "The selected drafts stay off the public site, and later imports leave them alone. Rejections as not suitable also hold back drafts with the same title next time. You can restore any of them from the Rejected tab."}
              </AlertDialogDescription>
            </AlertDialogHeader>

            {error ? (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <AlertDialogFooter>
              <AlertDialogCancel disabled={running}>
                Keep as drafts
              </AlertDialogCancel>
              <Button
                size="lg"
                variant={pending.action === "reject" ? "destructive" : "default"}
                disabled={running}
                onClick={runPending}
              >
                {running ? <LoaderCircle className="animate-spin" /> : null}
                {pending.action === "publish"
                  ? running
                    ? "Publishing…"
                    : "Publish activities"
                  : running
                    ? "Rejecting…"
                    : "Reject activities"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialog>
    </>
  );
}

type ActionResult = {
  done: string[];
  skipped: Array<{ id: string; reason: string }>;
};

async function publish(items: ActivityReviewItem[]): Promise<ActionResult> {
  const result = await publishAdminActivities(
    items.map(({ activity }) => activity.id),
  );
  return { done: result.published, skipped: result.skipped };
}

/**
 * Rejects each draft with its suggested reason; drafts without one were
 * judged by the editor, so they are rejected as not suitable.
 */
async function reject(items: ActivityReviewItem[]): Promise<ActionResult> {
  const byReason = new Map<RejectionReason, string[]>();
  for (const item of items) {
    const reason = item.suggestedRejection ?? "not_suitable";
    byReason.set(reason, [...(byReason.get(reason) ?? []), item.activity.id]);
  }
  const results = await Promise.all(
    [...byReason].map(([reason, ids]) => rejectAdminActivities(ids, reason)),
  );
  return {
    done: results.flatMap(({ rejected }) => rejected),
    skipped: results.flatMap(({ skipped }) => skipped),
  };
}

function ReviewSection({
  group,
  title,
  description,
  actions,
  items,
  selected,
  onSelect,
  onAction,
}: {
  group: ReviewGroup;
  title: string;
  description: string;
  actions: Action[];
  items: ActivityReviewItem[];
  selected: Set<string>;
  onSelect: (ids: string[], checked: boolean) => void;
  onAction: (action: Action, items: ActivityReviewItem[]) => void;
}) {
  const ids = items.map(({ activity }) => activity.id);
  const chosen = items.filter(({ activity }) => selected.has(activity.id));
  const allSelected = ids.length > 0 && chosen.length === ids.length;

  return (
    <section className="mt-10" aria-labelledby={`review-${group}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`review-${group}`} className="flex items-center gap-3">
          <span className="font-heading text-2xl text-primary">{title}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
            {items.length}
          </span>
        </h2>
        {items.length ? (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="size-4 accent-[var(--primary)]"
                checked={allSelected}
                onChange={() => onSelect(ids, !allSelected)}
              />
              Select all
            </label>
            {actions.map((action) => (
              <Button
                key={action}
                size="sm"
                variant={action === "publish" ? "default" : "outline"}
                disabled={!chosen.length}
                onClick={() => onAction(action, chosen)}
              >
                {action === "publish" ? <Send /> : <CircleSlash />}
                {action === "publish" ? "Publish" : "Reject"}{" "}
                {chosen.length || ""}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {items.length ? (
        <ul className="mt-3 divide-y overflow-hidden rounded-xl border bg-white shadow-sm">
          {items.map((item) => (
            <ReviewRow
              key={item.activity.id}
              item={item}
              checked={selected.has(item.activity.id)}
              onToggle={(checked) => onSelect([item.activity.id], checked)}
            />
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed px-5 py-6 text-sm text-muted-foreground">
          Nothing in this group.
        </p>
      )}
    </section>
  );
}

function ReviewRow({
  item,
  checked,
  onToggle,
}: {
  item: ActivityReviewItem;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const { activity } = item;
  const date = getNextDate(activity);
  const venue = formatVenue(activity);
  const cost = getCostLabel(activity);

  return (
    <li className="flex gap-4 px-5 py-4">
      <input
        type="checkbox"
        aria-label={`Select ${activity.title}`}
        className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
        checked={checked}
        onChange={(event) => onToggle(event.target.checked)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
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
        </div>
        <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span>{activity.source?.name ?? "Added manually"}</span>
          {date ? (
            <span>
              {formatDayLabel(date.startsAt)} ·{" "}
              {date.isAllDay ? "All day" : formatTime(date.startsAt)}
              {activity.dates.length > 1
                ? ` · ${activity.dates.length} dates`
                : ""}
            </span>
          ) : (
            <span>No date</span>
          )}
          {venue ? <span>{venue}</span> : null}
          {cost ? <span>{cost.label}</span> : null}
        </p>
        <p className="flex flex-wrap gap-1.5">
          {item.reasons.map((reason) => {
            const { label, tone } = REASONS[reason];
            const className = cn(
              "rounded-full px-2 py-0.5 text-xs",
              TONE_CLASSES[tone],
            );
            return reason === "duplicate" && item.duplicateOfId ? (
              <Link
                key={reason}
                href={`/admin/activities/${item.duplicateOfId}/edit`}
                className={cn(className, "hover:underline")}
              >
                Duplicate of another listing
              </Link>
            ) : (
              <span key={reason} className={className}>
                {label}
              </span>
            );
          })}
          {item.suggestedRejection ? (
            <span className="px-1 text-xs text-muted-foreground">
              Rejects as{" "}
              {REJECTION_REASON_LABELS[item.suggestedRejection].toLowerCase()}
            </span>
          ) : null}
        </p>
      </div>
    </li>
  );
}
