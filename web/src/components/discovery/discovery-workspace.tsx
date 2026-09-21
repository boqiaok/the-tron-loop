"use client";

import {
  AlertCircle,
  CalendarDays,
  Check,
  Clock3,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Route,
  Sparkles,
  Ticket,
  X,
  Download,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  buildItinerary,
  exportItineraryCalendar,
  getRecommendations,
  parseDiscoveryRequest,
} from "@/lib/api/discovery";
import { formatActivityDate } from "@/lib/dates/week-range";
import type { ActivityEnvironment } from "@/types/activity";
import type {
  DiscoveryIntent,
  DiscoverySearchScope,
  ItineraryResponse,
  Recommendation,
  RecommendationResponse,
  TravelSegment,
} from "@/types/discovery";

type MobileTab = "recommendations" | "plan";

interface ReplacementOption {
  candidate: Recommendation;
  plan: ItineraryResponse;
  travelDelta: number;
}

interface ReplacementState {
  targetId: string;
  loading: boolean;
  options: ReplacementOption[];
  error?: string;
}

export function DiscoveryWorkspace() {
  const started = useRef(false);
  const requestVersion = useRef(0);
  const [intent, setIntent] = useState<DiscoveryIntent>();
  const [scope, setScope] = useState<DiscoverySearchScope>("day");
  const [draft, setDraft] = useState<DiscoveryIntent>(() => defaultIntent());
  const [editing, setEditing] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [result, setResult] = useState<RecommendationResponse>();
  const [plan, setPlan] = useState<ItineraryResponse>();
  const [locked, setLocked] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [mobileTab, setMobileTab] = useState<MobileTab>("recommendations");
  const [detail, setDetail] = useState<Recommendation>();
  const [replacement, setReplacement] = useState<ReplacementState>();
  const plannedActivityDateIds = new Set(
    plan?.activities?.map((item) => item.date.id) ?? [],
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const timer = window.setTimeout(() => {
      const prompt = sessionStorage.getItem("tron-discovery-request");
      sessionStorage.removeItem("tron-discovery-request");
      if (prompt) {
        void parsePrompt(prompt);
        return;
      }
      const saved = sessionStorage.getItem("tron-discovery-state");
      if (saved) {
        try {
          const restored = JSON.parse(saved) as {
            intent: DiscoveryIntent;
            scope?: DiscoverySearchScope;
          };
          void applyIntent(restored.intent, restored.scope ?? "day");
          return;
        } catch {
          sessionStorage.removeItem("tron-discovery-state");
        }
      }
    }, 0);
    return () => {
      window.clearTimeout(timer);
      started.current = false;
    };
    // Initialisation intentionally reads the latest functions once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function parsePrompt(prompt: string) {
    setParsing(true);
    setError(undefined);
    try {
      const response = await parseDiscoveryRequest(prompt);
      if (response.intent) {
        setDraft(response.intent);
        setNotice(
          response.unresolved.length
            ? response.unresolved.join(" ")
            : "We translated your request into editable preferences.",
        );
        if (!response.manualEntryRequired) {
          await applyIntent(
            response.intent,
            searchScopeForPrompt(prompt, response),
          );
        }
      } else {
        setEditing(true);
        setNotice(
          "Natural-language parsing is unavailable. Choose your preferences below.",
        );
      }
    } catch (caught) {
      setEditing(true);
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not understand that request.",
      );
    } finally {
      setParsing(false);
    }
  }

  async function applyIntent(
    next: DiscoveryIntent,
    nextScope: DiscoverySearchScope = "day",
  ) {
    const version = ++requestVersion.current;
    setLoading(true);
    setError(undefined);
    setPlan(undefined);
    try {
      const response = await getRecommendations(next, nextScope);
      if (version !== requestVersion.current) return;
      setIntent(next);
      setScope(nextScope);
      setDraft(next);
      setResult(response);
      setEditing(false);
      setLocked([]);
      setExcluded([]);
      sessionStorage.setItem(
        "tron-discovery-state",
        JSON.stringify({ intent: next, scope: nextScope }),
      );
    } catch (caught) {
      if (version !== requestVersion.current) return;
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not load recommendations.",
      );
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }

  async function createPlan(options?: {
    locked?: string[];
    excluded?: string[];
  }) {
    if (!intent) return;
    const nextLocked = options?.locked ?? locked;
    const nextExcluded = options?.excluded ?? excluded;
    setPlanning(true);
    setError(undefined);
    try {
      const response = await buildItinerary({
        intent,
        scope,
        targetCount: intent.targetActivityCount,
        lockedActivityDateIds: nextLocked,
        excludedActivityDateIds: nextExcluded,
      });
      setPlan(response);
      setLocked(nextLocked);
      setExcluded(nextExcluded);
      setMobileTab("plan");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not build a plan.",
      );
    } finally {
      setPlanning(false);
    }
  }

  function toggleIncluded(id: string) {
    setLocked((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  async function prepareReplacement(id: string) {
    if (!intent || !plan?.activities) return;
    const keep = locked.filter((dateId) => dateId !== id);
    const currentIds = new Set(plan.activities.map((item) => item.date.id));
    const candidates = (result?.items ?? []).filter(
      (item) =>
        !currentIds.has(item.date.id) && !excluded.includes(item.date.id),
    );
    setReplacement({ targetId: id, loading: true, options: [] });

    const checked = await Promise.all(
      candidates.map(async (candidate) => {
        try {
          const candidatePlan = await buildItinerary({
            intent,
            scope,
            targetCount: intent.targetActivityCount,
            lockedActivityDateIds: [...keep, candidate.date.id],
            excludedActivityDateIds: [...new Set([...excluded, id])],
          });
          const returnedIds = new Set(
            candidatePlan.activities?.map((item) => item.date.id) ?? [],
          );
          if (
            candidatePlan.status !== "complete" ||
            ![...keep, candidate.date.id].every((dateId) =>
              returnedIds.has(dateId),
            )
          )
            return undefined;
          return {
            candidate,
            plan: candidatePlan,
            travelDelta:
              (candidatePlan.totalTravelMinutes ?? 0) -
              (plan.totalTravelMinutes ?? 0),
          } satisfies ReplacementOption;
        } catch {
          return undefined;
        }
      }),
    );
    const options = checked
      .filter((option): option is ReplacementOption => Boolean(option))
      .slice(0, 3);
    setReplacement({
      targetId: id,
      loading: false,
      options,
      error: options.length
        ? undefined
        : "No compatible replacements fit around the other activities.",
    });
  }

  async function exportCalendar() {
    if (!intent) return;
    try {
      const blob = await exportItineraryCalendar({
        intent,
        scope,
        targetCount: intent.targetActivityCount,
        lockedActivityDateIds: locked,
        excludedActivityDateIds: excluded,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "tron-loop-plan.ics";
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Calendar export failed.",
      );
    }
  }

  function confirmReplacement(option: ReplacementOption) {
    if (!replacement) return;
    setPlan(option.plan);
    setLocked((current) => [
      ...new Set([
        ...current.filter((id) => id !== replacement.targetId),
        option.candidate.date.id,
      ]),
    ]);
    setExcluded((current) => [...new Set([...current, replacement.targetId])]);
    setReplacement(undefined);
  }

  function removeActivity(id: string) {
    const activities = (plan?.activities ?? []).filter(
      (item) => item.date.id !== id,
    );
    setPlan((current) =>
      current
        ? {
            ...current,
            status: "partial",
            message: "Choose another activity or rebuild the plan.",
            activities,
            travelSegments: [],
          }
        : current,
    );
    setLocked((current) => current.filter((value) => value !== id));
    setExcluded((current) => [...new Set([...current, id])]);
  }

  return (
    <main className="bg-background px-5 pt-10 pb-24 sm:px-10 lg:px-12 lg:pb-10 xl:px-[6.875rem]">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold tracking-[0.13em] text-[var(--link)] uppercase">
          Personal activity finder
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-4xl text-primary sm:text-5xl">
              Plan a day that fits you
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Set what you need and what you prefer. We’ll explain every
              recommendation.
            </p>
          </div>
          {intent && !editing ? (
            <Button
              variant="outline"
              onClick={() => {
                setDraft(intent);
                setEditing(true);
              }}
            >
              Edit preferences
            </Button>
          ) : null}
        </div>

        {parsing ? <StatusLine label="Understanding your request…" /> : null}
        {notice ? (
          <Alert className="mt-5">
            <Sparkles />
            <AlertTitle>Check what we understood</AlertTitle>
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="destructive" className="mt-5">
            <AlertCircle />
            <AlertTitle>Something needs attention</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {editing ? (
          <IntentForm
            intent={draft}
            busy={loading}
            onChange={setDraft}
            onApply={(next) => void applyIntent(next, scope)}
          />
        ) : intent ? (
          <IntentSummary intent={intent} scope={scope} />
        ) : null}

        {intent && !editing ? (
          <div className="mt-7 flex rounded-lg border bg-white p-1 lg:hidden">
            <TabButton
              active={mobileTab === "recommendations"}
              onClick={() => setMobileTab("recommendations")}
            >
              Recommendations ({result?.items.length ?? 0})
            </TabButton>
            <TabButton
              active={mobileTab === "plan"}
              onClick={() => setMobileTab("plan")}
            >
              My plan ({plan?.activities?.length ?? 0})
            </TabButton>
          </div>
        ) : null}

        {loading ? <StatusLine label="Finding activities that fit…" /> : null}
        {result && intent && !editing ? (
          <div className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <section
              className={mobileTab === "plan" ? "hidden lg:block" : "block"}
            >
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-heading text-3xl text-primary">
                    Recommended for you
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {intent.preferred.interests.length
                      ? `${activityCountLabel(result.items.length)} related to ${intent.preferred.interests.map(titleCase).join(" and ")}, ranked by your other preferences.`
                      : `${activityCountLabel(result.items.length)} matching, ordered by your preferences.`}
                  </p>
                </div>
              </div>
              {result.items.length ? (
                <div className="mt-4 grid gap-4">
                  {result.items.map((item) => (
                    <RecommendationCard
                      key={item.date.id}
                      item={item}
                      included={locked.includes(item.date.id)}
                      inPlan={plannedActivityDateIds.has(item.date.id)}
                      onInclude={() => toggleIncluded(item.date.id)}
                      onDetails={() => setDetail(item)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyResults
                  result={result}
                  onUseSuggestion={(next) => void applyIntent(next, scope)}
                />
              )}
            </section>

            <aside
              className={
                mobileTab === "recommendations"
                  ? "hidden lg:block"
                  : "block lg:sticky lg:top-5"
              }
            >
              <PlanPanel
                intent={intent}
                plan={plan}
                scope={scope}
                planning={planning}
                locked={locked}
                replacement={replacement}
                onBuild={() => void createPlan()}
                onToggleKeep={toggleIncluded}
                onReplace={(id) => void prepareReplacement(id)}
                onConfirmReplacement={confirmReplacement}
                onCancelReplacement={() => setReplacement(undefined)}
                onExport={() => void exportCalendar()}
                onRemove={removeActivity}
              />
            </aside>
          </div>
        ) : null}
      </div>

      {intent && !editing && mobileTab === "recommendations" ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white p-3 shadow-lg lg:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <span className="text-sm">{locked.length} included</span>
            <Button
              disabled={planning || result?.items.length === 0}
              onClick={() => void createPlan()}
            >
              Build my plan
            </Button>
          </div>
        </div>
      ) : null}
      {detail ? (
        <DetailDialog item={detail} onClose={() => setDetail(undefined)} />
      ) : null}
    </main>
  );
}

function IntentForm({
  intent,
  busy,
  onChange,
  onApply,
}: {
  intent: DiscoveryIntent;
  busy: boolean;
  onChange: (intent: DiscoveryIntent) => void;
  onApply: (intent: DiscoveryIntent) => void;
}) {
  const [interests, setInterests] = useState(
    intent.preferred.interests.join(", "),
  );
  const field =
    "min-h-11 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30";
  function submit(event: FormEvent) {
    event.preventDefault();
    onApply({
      ...intent,
      preferred: {
        ...intent.preferred,
        interests: interests
          .split(",")
          .map((value) => slug(value))
          .filter(Boolean)
          .slice(0, 10),
      },
    });
  }
  const price = intent.required.freeOnly
    ? "only-free"
    : intent.preferred.free
      ? "prefer-free"
      : "any";
  return (
    <form
      onSubmit={submit}
      className="mt-7 rounded-xl border bg-secondary/55 p-5 shadow-sm sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Date">
          <input
            className={field}
            type="date"
            required
            value={intent.date}
            onChange={(e) => onChange({ ...intent, date: e.target.value })}
          />
        </Field>
        <Field label="From">
          <input
            className={field}
            type="time"
            required
            value={intent.availableFrom}
            onChange={(e) =>
              onChange({ ...intent, availableFrom: e.target.value })
            }
          />
        </Field>
        <Field label="To">
          <input
            className={field}
            type="time"
            required
            value={intent.availableTo}
            onChange={(e) =>
              onChange({ ...intent, availableTo: e.target.value })
            }
          />
        </Field>
        <Field label="Activities">
          <select
            className={field}
            value={intent.targetActivityCount}
            onChange={(e) =>
              onChange({
                ...intent,
                targetActivityCount: Number(e.target.value) as 2 | 3,
              })
            }
          >
            <option value={2}>2 activities</option>
            <option value={3}>3 activities</option>
          </select>
        </Field>
        <Field label="Environment">
          <select
            className={field}
            value={intent.required.environment ?? ""}
            onChange={(e) =>
              onChange({
                ...intent,
                required: {
                  ...intent.required,
                  environment: (e.target.value || undefined) as
                    ActivityEnvironment | undefined,
                },
              })
            }
          >
            <option value="">Any</option>
            <option value="indoor">Indoor required</option>
            <option value="outdoor">Outdoor required</option>
            <option value="mixed">Mixed required</option>
          </select>
        </Field>
        <Field label="Price">
          <select
            className={field}
            value={price}
            onChange={(e) =>
              onChange({
                ...intent,
                required: {
                  ...intent.required,
                  freeOnly: e.target.value === "only-free",
                },
                preferred: {
                  ...intent.preferred,
                  free: e.target.value === "prefer-free",
                },
              })
            }
          >
            <option value="any">Any price</option>
            <option value="prefer-free">Prefer free</option>
            <option value="only-free">Free required</option>
          </select>
        </Field>
        <Field label="Preferred suburb">
          <input
            className={field}
            value={intent.preferred.suburb ?? ""}
            placeholder="Hamilton East"
            onChange={(e) =>
              onChange({
                ...intent,
                preferred: {
                  ...intent.preferred,
                  suburb: e.target.value || undefined,
                },
              })
            }
          />
        </Field>
        <Field label="Travel">
          <select
            className={field}
            value={intent.travelMode}
            onChange={(e) =>
              onChange({
                ...intent,
                travelMode: e.target.value as "driving" | "walking",
              })
            }
          >
            <option value="driving">Driving</option>
            <option value="walking">Walking</option>
          </select>
        </Field>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Interests">
          <input
            className={field}
            value={interests}
            placeholder="arts, science, community"
            onChange={(e) => setInterests(e.target.value)}
          />
        </Field>
        <label className="flex min-h-11 items-center gap-2 rounded-md border bg-white px-3 text-sm">
          <input
            type="checkbox"
            checked={Boolean(intent.required.familyFriendly)}
            onChange={(e) =>
              onChange({
                ...intent,
                required: {
                  ...intent.required,
                  familyFriendly: e.target.checked,
                },
              })
            }
          />{" "}
          Family-friendly required
        </label>
      </div>
      <div className="mt-5 flex justify-end">
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? <LoaderCircle className="animate-spin" /> : null} Update
          results
        </Button>
      </div>
    </form>
  );
}

function IntentSummary({
  intent,
  scope,
}: {
  intent: DiscoveryIntent;
  scope: DiscoverySearchScope;
}) {
  const required = [
    intent.required.familyFriendly && "Family-friendly",
    intent.required.environment &&
      `${titleCase(intent.required.environment)} required`,
    intent.required.freeOnly && "Free required",
  ].filter(Boolean) as string[];
  const preferred = [
    intent.preferred.free && "Prefer free",
    intent.preferred.suburb,
  ].filter(Boolean) as string[];
  const topics = intent.preferred.interests.map(titleCase);
  return (
    <section className="mt-7 rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="inline-flex items-center gap-2 font-semibold">
          <CalendarDays className="size-4 text-primary" />
          {scope === "weekend"
            ? "This weekend"
            : scope === "week"
              ? "Next 7 days"
              : formatLongDate(intent.date)}
        </span>
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Clock3 className="size-4" />
          {scope === "week" || scope === "weekend"
            ? "All day"
            : `${intent.availableFrom}–${intent.availableTo}`}
        </span>
      </div>
      <ChipRow
        label="Required"
        values={required.length ? required : ["No required preferences"]}
      />
      <ChipRow
        label="Topics"
        values={topics.length ? topics : ["All topics"]}
      />
      <ChipRow
        label="Preferred"
        values={preferred.length ? preferred : ["Best fit"]}
      />
    </section>
  );
}

function RecommendationCard({
  item,
  included,
  inPlan,
  onInclude,
  onDetails,
}: {
  item: Recommendation;
  included: boolean;
  inPlan: boolean;
  onInclude: () => void;
  onDetails: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-xl border bg-white shadow-sm sm:grid sm:grid-cols-[10rem_1fr]">
      <div
        className="min-h-36 bg-secondary bg-cover bg-center"
        style={
          item.activity.imageUrl
            ? {
                backgroundImage: `url(${JSON.stringify(item.activity.imageUrl)})`,
              }
            : undefined
        }
      />
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-heading text-2xl text-primary">
              {item.activity.title}
            </h3>
            {inPlan ? (
              <Badge className="mt-2" variant="secondary">
                In your plan
              </Badge>
            ) : null}
          </div>
          {item.activity.environment !== "unknown" ? (
            <Badge variant="secondary">
              {titleCase(item.activity.environment)}
            </Badge>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {formatActivityDate(item.date.startsAt, item.date.endsAt, false)}
          </span>
          {item.activity.venue ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {item.activity.venue.name}
              {item.activity.venue.suburb
                ? `, ${item.activity.venue.suburb}`
                : ""}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Ticket className="size-3.5" />
            {costLabel(item)}
          </span>
        </div>
        {item.reasons.length ? (
          <div className="mt-4 rounded-lg bg-accent/65 p-3">
            <p className="text-xs font-bold tracking-wide text-accent-foreground uppercase">
              Why it fits
            </p>
            <ul className="mt-2 grid gap-1.5 text-sm">
              {item.reasons.slice(0, 2).map((reason, index) => (
                <li key={`${reason.code}-${index}`} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  {reasonLabel(reason)}
                </li>
              ))}
            </ul>
            {item.unmetPreferences[0] ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Note: {unmetLabel(item.unmetPreferences[0])}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onDetails}>
            View details
          </Button>
          <Button
            variant={included ? "secondary" : "outline"}
            onClick={onInclude}
          >
            {included ? <Check /> : null}
            {included ? "Included" : "Include in my plan"}
          </Button>
        </div>
      </div>
    </article>
  );
}

function PlanPanel({
  intent,
  plan,
  scope,
  planning,
  locked,
  replacement,
  onBuild,
  onToggleKeep,
  onReplace,
  onConfirmReplacement,
  onCancelReplacement,
  onExport,
  onRemove,
}: {
  intent: DiscoveryIntent;
  plan?: ItineraryResponse;
  scope: DiscoverySearchScope;
  planning: boolean;
  locked: string[];
  replacement?: ReplacementState;
  onBuild: () => void;
  onToggleKeep: (id: string) => void;
  onReplace: (id: string) => void;
  onConfirmReplacement: (option: ReplacementOption) => void;
  onCancelReplacement: () => void;
  onExport: () => void;
  onRemove: (id: string) => void;
}) {
  const plannedDayLabel = plan?.activities?.length
    ? formatPlanDays(plan.activities)
    : undefined;

  return (
    <section className="rounded-xl border bg-white p-5 shadow-[0_12px_30px_rgba(18,59,56,0.1)]">
      <p className="text-xs font-bold tracking-wide text-[var(--link)] uppercase">
        Your day
      </p>
      <h2 className="mt-2 font-heading text-3xl text-primary">
        Plan your day
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {plannedDayLabel
          ? `${plannedDayLabel} · ${activityCountLabel(plan?.activities?.length ?? 0)}`
          : scope === "day"
            ? `${intent.availableFrom}–${intent.availableTo}`
            : "Choose a day from the matching activities"}
      </p>
      {!plan ? (
        <>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Build a compatible {intent.targetActivityCount}-activity plan.
            Include a favourite first, or let us choose.
          </p>
          <Button
            className="mt-5 w-full"
            size="lg"
            disabled={planning}
            onClick={onBuild}
          >
            {planning ? <LoaderCircle className="animate-spin" /> : <Route />}
            Build my plan
          </Button>
        </>
      ) : null}
      {plan ? (
        <>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge>
              {plan.status === "complete"
                ? "Ready"
                : plan.status === "partial"
                  ? "Partial plan"
                  : "Needs attention"}
            </Badge>
            {plan.knownEntryCost !== undefined ? (
              <Badge variant="secondary">
                Entry{" "}
                {plan.knownEntryCost === 0
                  ? "free"
                  : `$${plan.knownEntryCost.toFixed(2)}`}
                {plan.hasUnknownCosts ? " + unknown costs" : ""}
              </Badge>
            ) : null}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{plan.message}</p>
          {plan.activities?.length ? (
            <div className="mt-5">
              {plan.activities.map((item, index) => (
                <div key={item.date.id}>
                  <div className="relative border-l-2 border-primary/25 pb-5 pl-5 last:pb-0">
                    <span className="absolute -left-[7px] top-1 size-3 rounded-full bg-[var(--gold)] ring-4 ring-white" />
                    <p className="text-xs font-semibold text-[var(--link)]">
                      {timeLabel(item.date.startsAt)}–
                      {timeLabel(item.date.endsAt!)}
                    </p>
                    {item.date.durationEstimated ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        ~{item.activity.visitMinutes} min estimated visit
                      </p>
                    ) : null}
                    <h3 className="mt-1 font-semibold text-primary">
                      {item.activity.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.activity.venue?.name ?? "Venue not listed"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant={
                          locked.includes(item.date.id) ? "secondary" : "ghost"
                        }
                        onClick={() => onToggleKeep(item.date.id)}
                      >
                        {locked.includes(item.date.id) ? "Kept" : "Keep"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onReplace(item.date.id)}
                      >
                        Replace
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRemove(item.date.id)}
                      >
                        Remove
                      </Button>
                    </div>
                    {replacement?.targetId === item.date.id ? (
                      <ReplacementPicker
                        replacement={replacement}
                        onConfirm={onConfirmReplacement}
                        onCancel={onCancelReplacement}
                      />
                    ) : null}
                  </div>
                  {plan.travelSegments?.[index] ? (
                    <TravelRow segment={plan.travelSegments[index]} />
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          {plan.coveredInterests?.length && (plan.activities?.length ?? 0) > 1 ? (
            <div className="mt-5 rounded-lg bg-secondary p-3 text-sm">
              <strong>Why this combination?</strong>
              <p className="mt-1 text-muted-foreground">
                It covers {plan.coveredInterests.map(titleCase).join(" and ")}{" "}
                with enough time between activities.
              </p>
            </div>
          ) : null}
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button variant="outline" disabled={planning} onClick={onBuild}>
              {planning ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
              Rebuild plan
            </Button>
            <Button
              variant="outline"
              disabled={plan.status !== "complete" || !plan.activities?.length}
              onClick={onExport}
            >
              <Download /> Export .ics
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}

function TravelRow({ segment }: { segment: TravelSegment }) {
  return (
    <div className="mb-5 ml-5 rounded-md bg-secondary/70 p-2 text-xs text-muted-foreground">
      <Route className="mr-1 inline size-3.5" />
      Estimated {segment.mode}: {segment.estimatedMinutes} min · arrival buffer{" "}
      {segment.arrivalBufferMinutes} min
      {segment.freeMinutes ? ` · ${segment.freeMinutes} min free` : ""}
    </div>
  );
}

function ReplacementPicker({
  replacement,
  onConfirm,
  onCancel,
}: {
  replacement: ReplacementState;
  onConfirm: (option: ReplacementOption) => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-3 rounded-lg border border-primary/15 bg-secondary/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold tracking-wide text-primary uppercase">
          Compatible replacements
        </p>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {replacement.loading ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <LoaderCircle className="size-3.5 animate-spin" /> Checking times and
          travel…
        </p>
      ) : null}
      {replacement.error ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {replacement.error}
        </p>
      ) : null}
      <div className="mt-2 space-y-2">
        {replacement.options.map((option) => (
          <div
            key={option.candidate.date.id}
            className="rounded-md bg-white p-3 text-xs shadow-sm"
          >
            <p className="font-semibold text-primary">
              {option.candidate.activity.title}
            </p>
            <p className="mt-1 text-muted-foreground">
              {timeLabel(option.candidate.date.startsAt)} ·{" "}
              {costLabel(option.candidate)} · travel{" "}
              {option.travelDelta === 0
                ? "unchanged"
                : `${option.travelDelta > 0 ? "+" : ""}${option.travelDelta} min`}
            </p>
            <Button
              className="mt-2"
              size="sm"
              variant="outline"
              onClick={() => onConfirm(option)}
            >
              Use this activity
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailDialog({
  item,
  onClose,
}: {
  item: Recommendation;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/35"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-detail-title"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="h-full w-full max-w-lg overflow-y-auto bg-background p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-wide text-[var(--link)] uppercase">
              Activity details
            </p>
            <h2
              id="activity-detail-title"
              className="mt-2 font-heading text-3xl text-primary"
            >
              {item.activity.title}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close details"
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
        <p className="mt-5 leading-7 text-muted-foreground">
          {item.activity.summary ?? item.activity.description}
        </p>
        {item.activity.summary ? (
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {item.activity.description}
          </p>
        ) : null}
        <dl className="mt-6 grid gap-4 rounded-xl border bg-white p-5 text-sm">
          <div>
            <dt className="font-semibold">When</dt>
            <dd className="mt-1 text-muted-foreground">
              {formatActivityDate(item.date.startsAt, item.date.endsAt, false)}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Where</dt>
            <dd className="mt-1 text-muted-foreground">
              {item.activity.venue
                ? `${item.activity.venue.name}${item.activity.venue.address ? `, ${item.activity.venue.address}` : ""}`
                : "Venue not listed"}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Price</dt>
            <dd className="mt-1 text-muted-foreground">{costLabel(item)}</dd>
          </div>
        </dl>
        {item.activity.sourceUrl ? (
          <a
            className="mt-6 inline-flex font-semibold text-[var(--link)] underline underline-offset-2"
            href={item.activity.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            View original source
          </a>
        ) : null}
      </div>
    </div>
  );
}

function EmptyResults({
  result,
  onUseSuggestion,
}: {
  result: RecommendationResponse;
  onUseSuggestion: (intent: DiscoveryIntent) => void;
}) {
  return (
    <div className="mt-4 rounded-xl border border-dashed bg-white p-7">
      <h3 className="font-heading text-2xl text-primary">No exact matches</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {result.relaxationSuggestions.length
          ? "Try one verified adjustment:"
          : "No published activities fit the full date and time window. Edit the preferences or try another date."}
      </p>
      {result.relaxationSuggestions.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {result.relaxationSuggestions.map((suggestion) => (
            <Button
              key={suggestion.code}
              variant="outline"
              onClick={() => onUseSuggestion(suggestion.intent)}
            >
              {suggestion.label} · {suggestion.count}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
function StatusLine({ label }: { label: string }) {
  return (
    <div className="mt-5 flex items-center gap-2 rounded-lg border bg-white p-4 text-sm">
      <LoaderCircle className="size-4 animate-spin text-primary" />
      {label}
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
function ChipRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="w-16 text-xs font-bold uppercase text-muted-foreground">
        {label}
      </span>
      {values.map((value) => (
        <Badge key={value} variant="secondary">
          {value}
        </Badge>
      ))}
    </div>
  );
}
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold ${active ? "bg-primary text-white" : "text-muted-foreground"}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function defaultIntent(): DiscoveryIntent {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return {
    date: formatter.format(new Date()),
    availableFrom: "09:00",
    availableTo: "17:00",
    timezone: "Pacific/Auckland",
    required: {},
    preferred: { interests: [] },
    targetActivityCount: 2,
    travelMode: "driving",
  };
}

function searchScopeForPrompt(
  prompt: string,
  response: { unresolved: string[] },
): DiscoverySearchScope {
  if (/\bweekends?\b/i.test(prompt)) return "weekend";
  if (response.unresolved.some((item) => /next 7 days/i.test(item))) {
    return "week";
  }
  return "day";
}

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
function titleCase(value: string) {
  return value
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "full",
    timeZone: "Pacific/Auckland",
  }).format(new Date(`${value}T12:00:00+12:00`));
}
function timeLabel(value: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Pacific/Auckland",
  }).format(new Date(value));
}
function formatPlanDays(activities: NonNullable<ItineraryResponse["activities"]>) {
  const labels = Array.from(
    new Set(
      activities.map((item) =>
        new Intl.DateTimeFormat("en-NZ", {
          weekday: "short",
          day: "numeric",
          month: "short",
          timeZone: "Pacific/Auckland",
        }).format(new Date(item.date.startsAt)),
      ),
    ),
  );
  if (labels.length <= 2) return labels.join(" · ");
  return `${labels[0]} + ${labels.length - 1} more days`;
}
function activityCountLabel(count: number) {
  return `${count} ${count === 1 ? "activity" : "activities"}`;
}
function costLabel(item: Recommendation) {
  if (item.activity.costType === "free") return "Free";
  if (item.activity.costType === "unknown") return "Price not listed";
  return item.activity.costAmountFrom == null
    ? "Paid"
    : `From $${item.activity.costAmountFrom.toFixed(2)}`;
}
function reasonLabel(reason: { code: string; value?: string }) {
  const values: Record<string, string> = {
    FREE: "Free, as you preferred",
    FAMILY_FRIENDLY: "Labelled family-friendly by the organiser",
    ENVIRONMENT_MATCH: `Matches your ${reason.value} requirement`,
    PREFERRED_SUBURB: `In your preferred area, ${reason.value}`,
    INTEREST_MATCH: `Matches your interest in ${(reason.value ?? "").split(",").map(titleCase).join(" and ")}`,
  };
  return values[reason.code] ?? "Matches your preferences";
}
function unmetLabel(reason: { code: string; value?: string }) {
  if (reason.code === "NOT_FREE") return "this activity is not listed as free.";
  if (reason.code === "PREFERRED_SUBURB_NOT_MATCHED")
    return `outside your preferred area, ${reason.value}.`;
  return "it does not match your selected interests.";
}
