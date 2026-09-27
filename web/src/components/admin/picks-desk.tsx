"use client";

import {
  ArrowDown,
  ArrowUp,
  LoaderCircle,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ActivityStatusBadge } from "@/components/admin/activity-status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatDayLabel,
  formatTime,
  formatVenueShort,
  getCostLabel,
} from "@/lib/activities/format";
import { publishAdminActivity } from "@/lib/api/admin-activities";
import {
  publishAdminWeeklyGuide,
  saveAdminWeeklyGuide,
} from "@/lib/api/admin-weekly-guides";
import { cn } from "@/lib/utils";
import type { Activity } from "@/types/activity";
import type {
  AdminWeeklyGuide,
  GuideCandidate,
  QualityExclusion,
  QualityReason,
} from "@/types/weekly-guide";

const MAX_PICKS = 12;
const NOTE_MAX_LENGTH = 280;
const INTRO_MAX_LENGTH = 500;

const REASON_LABELS: Record<QualityReason, string> = {
  one_off: "One-off",
  short_run: "Short run",
  long_run: "Long run",
  sold_out: "Sold out",
  featured: "Promoted on source",
  festival: "Festival",
  performance: "Performance or talk",
  performers: "Named performers",
  market: "Market",
  weekly_regular: "Weekly regular",
  meetup: "Social meetup",
  free: "Free",
};

const NEGATIVE_REASONS = new Set<QualityReason>([
  "long_run",
  "weekly_regular",
  "meetup",
]);

function exclusionLabel(candidate: GuideCandidate): string {
  const labels: Record<QualityExclusion, string> = {
    service: "Service, not an outing",
    gambling: "Gambling",
    sold_out: "Sold out",
    repeated_format: `Same title at ${candidate.repeatedFormatCount} listings`,
  };
  return candidate.exclusion ? labels[candidate.exclusion] : "";
}

interface Pick {
  activityId: string;
  note: string;
}

export function PicksDesk({ data }: { data: AdminWeeklyGuide }) {
  const router = useRouter();
  const { guide, candidates, weekStart } = data;
  const savedPicks: Pick[] =
    guide?.items.map((item) => ({
      activityId: item.activity.id,
      note: item.note ?? "",
    })) ?? [];
  const savedIntro = guide?.intro ?? "";
  // A week nobody has started opens with the suggestions, ready to review.
  const [picks, setPicks] = useState<Pick[]>(() =>
    guide ? savedPicks : suggestedPicks(candidates),
  );
  const [intro, setIntro] = useState(savedIntro);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(
    guide ? null : "Suggestions loaded. Nothing is saved yet.",
  );

  const activities = new Map<string, Activity>([
    ...(guide?.items.map(
      (item) => [item.activity.id, item.activity] as const,
    ) ?? []),
    ...candidates.map(
      (candidate) => [candidate.activity.id, candidate.activity] as const,
    ),
  ]);
  const picked = new Set(picks.map((pick) => pick.activityId));
  const dirty =
    intro.trim() !== savedIntro ||
    JSON.stringify(picks.map((pick) => [pick.activityId, pick.note.trim()])) !==
      JSON.stringify(savedPicks.map((pick) => [pick.activityId, pick.note]));
  const published = guide?.status === "published";
  const draftPicks = picks.filter(
    (pick) => activities.get(pick.activityId)?.status !== "published",
  );
  const eligible = candidates.filter((candidate) => !candidate.exclusion);
  const filteredOut = candidates.filter((candidate) => candidate.exclusion);

  function add(activityId: string) {
    setPicks((current) =>
      current.length >= MAX_PICKS ? current : [...current, { activityId, note: "" }],
    );
  }

  function remove(activityId: string) {
    setPicks((current) =>
      current.filter((pick) => pick.activityId !== activityId),
    );
  }

  function move(index: number, offset: -1 | 1) {
    setPicks((current) => {
      const next = [...current];
      const [pick] = next.splice(index, 1);
      next.splice(index + offset, 0, pick);
      return next;
    });
  }

  function setNote(activityId: string, note: string) {
    setPicks((current) =>
      current.map((pick) =>
        pick.activityId === activityId ? { ...pick, note } : pick,
      ),
    );
  }

  function applySuggestions() {
    const notes = new Map(picks.map((pick) => [pick.activityId, pick.note]));
    setPicks(
      suggestedPicks(candidates).map((pick) => ({
        ...pick,
        note: notes.get(pick.activityId) ?? "",
      })),
    );
  }

  async function run(
    action: string,
    work: () => Promise<unknown>,
    done: string,
  ) {
    setBusy(action);
    setError(null);
    setMessage(null);
    try {
      await work();
      setMessage(done);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  const input = () => ({
    intro: intro.trim() || null,
    items: picks.map((pick) => ({
      activityId: pick.activityId,
      note: pick.note.trim() || null,
    })),
  });

  return (
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <section aria-labelledby="candidates-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="candidates-heading" className="text-lg font-semibold text-primary">
            Candidates · {eligible.length}
          </h2>
          <span className="text-sm text-muted-foreground">
            {candidates.length} draft and published activities this week, best
            first
          </span>
        </div>

        {candidates.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-white px-4 py-6 text-sm text-muted-foreground">
            No draft or published activities have a session this week yet.
          </p>
        ) : null}

        <ul className="flex flex-col gap-2">
          {eligible.map((candidate) => (
            <CandidateRow
              key={candidate.activity.id}
              candidate={candidate}
              picked={picked.has(candidate.activity.id)}
              full={picks.length >= MAX_PICKS}
              onAdd={() => add(candidate.activity.id)}
            />
          ))}
        </ul>

        {filteredOut.length ? (
          <details className="rounded-lg border bg-white">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
              Filtered out · {filteredOut.length}
              <span className="ml-2 font-normal text-muted-foreground">
                Sold out, services, gambling and titles repeated across many
                listings. You can still add them.
              </span>
            </summary>
            <ul className="flex flex-col gap-2 px-3 pb-3">
              {filteredOut.map((candidate) => (
                <CandidateRow
                  key={candidate.activity.id}
                  candidate={candidate}
                  picked={picked.has(candidate.activity.id)}
                  full={picks.length >= MAX_PICKS}
                  onAdd={() => add(candidate.activity.id)}
                />
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      <section
        aria-labelledby="picks-heading"
        className="flex flex-col gap-4 rounded-xl border bg-white p-4 lg:sticky lg:top-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="picks-heading" className="text-lg font-semibold text-primary">
            Picks · {picks.length}
          </h2>
          <GuideStatus
            status={guide?.status ?? null}
            publishedAt={guide?.publishedAt ?? null}
            dirty={dirty}
          />
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Intro
          <textarea
            id="guide-intro"
            value={intro}
            maxLength={INTRO_MAX_LENGTH}
            rows={2}
            onChange={(event) => setIntro(event.target.value)}
            placeholder="One or two sentences on the shape of the week."
            className="min-h-16 rounded-md border bg-white px-3 py-2 text-sm font-normal shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
          />
        </label>

        {picks.length ? (
          <ol className="flex flex-col gap-2.5">
            {picks.map((pick, index) => {
              const activity = activities.get(pick.activityId);
              return (
                <li
                  key={pick.activityId}
                  className="flex flex-col gap-2 rounded-lg border bg-[#fbfaf8] p-3"
                >
                  <div className="flex items-start gap-2">
                    <span className="w-5 shrink-0 font-serif text-lg leading-6 text-action italic">
                      {index + 1}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-sm leading-5 font-semibold">
                        {activity?.title ?? "Activity no longer available"}
                      </span>
                      {activity && activity.status !== "published" ? (
                        <span className="flex flex-wrap items-center gap-2">
                          <ActivityStatusBadge status={activity.status} />
                          {activity.status === "draft" ? (
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              disabled={busy !== null}
                              onClick={() =>
                                run(
                                  activity.id,
                                  () => publishAdminActivity(activity.id),
                                  `Published “${activity.title}”.`,
                                )
                              }
                            >
                              {busy === activity.id ? (
                                <LoaderCircle className="animate-spin" />
                              ) : null}
                              Publish activity
                            </Button>
                          ) : null}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        aria-label="Move up"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        aria-label="Move down"
                        disabled={index === picks.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        aria-label="Remove pick"
                        onClick={() => remove(pick.activityId)}
                      >
                        <X />
                      </Button>
                    </div>
                  </div>
                  <input
                    id={`note-${pick.activityId}`}
                    aria-label={`Why go to ${activity?.title ?? "this activity"}`}
                    value={pick.note}
                    maxLength={NOTE_MAX_LENGTH}
                    onChange={(event) => setNote(pick.activityId, event.target.value)}
                    placeholder="Why it’s worth going"
                    className="h-9 rounded-md border bg-white px-2.5 text-sm shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/20"
                  />
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">
            No picks yet. Add candidates from the list.
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={applySuggestions}
          disabled={busy !== null}
        >
          <Sparkles />
          Replace with suggestions
        </Button>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {message ? (
          <p role="status" className="text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}
        {!published && draftPicks.length ? (
          <p className="text-sm text-amber-800">
            {draftPicks.length === 1
              ? "1 pick is a draft."
              : `${draftPicks.length} picks are drafts.`}{" "}
            Publish them before publishing the guide.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={published ? "default" : "outline"}
            disabled={busy !== null || !dirty}
            onClick={() =>
              run(
                "save",
                () => saveAdminWeeklyGuide(weekStart, input()),
                published ? "Saved. The home page shows the changes." : "Draft saved.",
              )
            }
          >
            {busy === "save" ? <LoaderCircle className="animate-spin" /> : null}
            {published ? "Save changes" : "Save draft"}
          </Button>
          {!published ? (
            <Button
              type="button"
              disabled={busy !== null || !picks.length || draftPicks.length > 0}
              onClick={() =>
                run(
                  "publish",
                  async () => {
                    await saveAdminWeeklyGuide(weekStart, input());
                    await publishAdminWeeklyGuide(weekStart);
                  },
                  "Published. The picks now lead the home page for this week.",
                )
              }
            >
              {busy === "publish" ? (
                <LoaderCircle className="animate-spin" />
              ) : null}
              Publish picks
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function suggestedPicks(candidates: GuideCandidate[]): Pick[] {
  return candidates
    .filter((candidate) => candidate.suggested)
    .map((candidate) => ({ activityId: candidate.activity.id, note: "" }));
}

function GuideStatus({
  status,
  publishedAt,
  dirty,
}: {
  status: "draft" | "published" | null;
  publishedAt: string | null;
  dirty: boolean;
}) {
  const label =
    status === "published" && publishedAt
      ? `Published ${formatDayLabel(publishedAt)}`
      : status === "draft"
        ? "Draft"
        : "Not saved";
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      {dirty ? <span>Unsaved changes</span> : null}
      <Badge
        variant="outline"
        className={cn(
          status === "published"
            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
            : "border-amber-300 bg-amber-50 text-amber-800",
        )}
      >
        {label}
      </Badge>
    </span>
  );
}

function CandidateRow({
  candidate,
  picked,
  full,
  onAdd,
}: {
  candidate: GuideCandidate;
  picked: boolean;
  full: boolean;
  onAdd: () => void;
}) {
  const { activity } = candidate;
  const date = activity.dates[0];
  const cost = getCostLabel(activity);
  const venue = formatVenueShort(activity);

  return (
    <li
      className={cn(
        "grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-3 rounded-lg border bg-white p-3",
        picked && "border-action/40 bg-accent/40",
      )}
    >
      <span
        className="flex flex-col items-center gap-1 pt-0.5"
        title="Quality score out of 100"
      >
        <span className="font-mono text-base font-semibold tabular-nums">
          {candidate.score}
        </span>
        <span className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <span
            className="block h-full rounded-full bg-action"
            style={{ width: `${candidate.score}%` }}
          />
        </span>
      </span>

      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/activities/${activity.id}/edit`}
            className="text-sm font-semibold text-foreground"
          >
            {activity.title}
          </Link>
          {activity.status !== "published" ? (
            <ActivityStatusBadge status={activity.status} />
          ) : null}
          {candidate.suggested ? (
            <Badge variant="outline" className="border-action/30 text-action">
              <Sparkles />
              Suggested
            </Badge>
          ) : null}
        </span>
        <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {date ? (
            <span>
              {formatDayLabel(date.startsAt)} ·{" "}
              {date.isAllDay ? "All day" : formatTime(date.startsAt)}
              {activity.dates.length > 1
                ? ` · ${activity.dates.length} sessions`
                : ""}
            </span>
          ) : null}
          {venue ? <span>{venue}</span> : null}
          {cost ? <span>{cost.label}</span> : null}
          {candidate.organizer ? <span>by {candidate.organizer}</span> : null}
        </span>
        <span className="flex flex-wrap gap-1.5">
          {candidate.exclusion ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
              {exclusionLabel(candidate)}
            </span>
          ) : null}
          {candidate.reasons.map((reason) => (
            <span
              key={reason}
              className={cn(
                "rounded-full px-2 py-0.5 text-xs",
                NEGATIVE_REASONS.has(reason)
                  ? "bg-amber-50 text-amber-800"
                  : "bg-accent text-accent-foreground",
              )}
            >
              {REASON_LABELS[reason]}
            </span>
          ))}
        </span>
      </span>

      <Button
        type="button"
        size="sm"
        variant={picked ? "ghost" : "outline"}
        disabled={picked || full}
        onClick={onAdd}
      >
        {picked ? (
          "Picked"
        ) : (
          <>
            <Plus />
            Add
          </>
        )}
      </Button>
    </li>
  );
}
