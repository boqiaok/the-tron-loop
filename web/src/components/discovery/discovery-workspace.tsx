"use client";

import { LoaderCircle, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

import Link from "next/link";

import { activityHref } from "@/components/activities/activity-row";
import { CategoryLabel } from "@/components/activities/category-label";
import { CostPill } from "@/components/activities/cost-pill";
import { formatDayLabel, formatTime, getCostLabel } from "@/lib/activities/format";
import {
  buildItinerary,
  exportItineraryCalendar,
  getRecommendations,
  parseDiscoveryRequest,
} from "@/lib/api/discovery";
import {
  PLAN_REQUEST_KEY,
  PLAN_STATE_KEY,
  type SavedPlanState,
} from "@/lib/discovery/plan-request";
import { cn } from "@/lib/utils";
import type { ActivityEnvironment } from "@/types/activity";
import type {
  DiscoveryIntent,
  DiscoverySearchScope,
  ItineraryResponse,
  Recommendation,
  RecommendationResponse,
  TravelSegment,
} from "@/types/discovery";

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

/**
 * One scrolling page, three stacked states: what we understood (editable
 * chips), what we suggest, and what the day looks like.
 */
export function DiscoveryWorkspace() {
  const started = useRef(false);
  const requestVersion = useRef(0);
  const [request, setRequest] = useState("");
  const [editingRequest, setEditingRequest] = useState(false);
  const [intent, setIntent] = useState<DiscoveryIntent>();
  const [scope, setScope] = useState<DiscoverySearchScope>("day");
  const [draft, setDraft] = useState<DiscoveryIntent>(() => defaultIntent());
  const [formOpen, setFormOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [result, setResult] = useState<RecommendationResponse>();
  const [plan, setPlan] = useState<ItineraryResponse>();
  const [locked, setLocked] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [replacement, setReplacement] = useState<ReplacementState>();
  const planPanel = useRef<HTMLElement>(null);
  const plannedActivityDateIds = new Set(
    plan?.activities?.map((item) => item.date.id) ?? [],
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const timer = window.setTimeout(() => {
      const prompt = sessionStorage.getItem(PLAN_REQUEST_KEY);
      sessionStorage.removeItem(PLAN_REQUEST_KEY);
      if (prompt) {
        setRequest(prompt);
        void parsePrompt(prompt);
        return;
      }
      const saved = sessionStorage.getItem(PLAN_STATE_KEY);
      if (saved) {
        try {
          const restored = JSON.parse(saved) as SavedPlanState;
          const restoredScope = restored.scope ?? "day";
          setRequest(restored.request ?? "");
          void applyIntent(restored.intent, restoredScope, restored.request).then(
            (ok) => {
              if (ok && restored.locked?.length) {
                void createPlan({
                  locked: restored.locked,
                  base: {
                    intent: restored.intent,
                    scope: restoredScope,
                    request: restored.request ?? "",
                  },
                });
              }
            },
          );
          return;
        } catch {
          sessionStorage.removeItem(PLAN_STATE_KEY);
        }
      }
      setEditingRequest(true);
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
    setNotice(undefined);
    try {
      const response = await parseDiscoveryRequest(prompt);
      if (response.intent) {
        setDraft(response.intent);
        setNotice(response.unresolved.length ? response.unresolved.join(" ") : undefined);
        if (response.manualEntryRequired) {
          setFormOpen(true);
        } else {
          await applyIntent(
            response.intent,
            searchScopeForPrompt(prompt, response),
            prompt,
          );
        }
      } else {
        setFormOpen(true);
        setNotice(
          "We couldn’t read that request automatically. Set the conditions below instead.",
        );
      }
    } catch (caught) {
      setFormOpen(true);
      setError(
        caught instanceof Error ? caught.message : "Could not understand that request.",
      );
    } finally {
      setParsing(false);
    }
  }

  async function applyIntent(
    next: DiscoveryIntent,
    nextScope: DiscoverySearchScope = "day",
    nextRequest: string = request,
  ): Promise<boolean> {
    const version = ++requestVersion.current;
    setLoading(true);
    setError(undefined);
    setPlan(undefined);
    setReplacement(undefined);
    try {
      const response = await getRecommendations(next, nextScope);
      if (version !== requestVersion.current) return false;
      setIntent(next);
      setScope(nextScope);
      setDraft(next);
      setResult(response);
      setFormOpen(false);
      setLocked([]);
      setExcluded([]);
      saveState({ intent: next, scope: nextScope, request: nextRequest });
      return true;
    } catch (caught) {
      if (version !== requestVersion.current) return false;
      setError(
        caught instanceof Error ? caught.message : "Could not load recommendations.",
      );
      return false;
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }

  async function createPlan(options?: {
    locked?: string[];
    excluded?: string[];
    base?: {
      intent: DiscoveryIntent;
      scope: DiscoverySearchScope;
      request: string;
    };
  }) {
    const planIntent = options?.base?.intent ?? intent;
    const planScope = options?.base?.scope ?? scope;
    if (!planIntent) return;
    const nextLocked = options?.locked ?? locked;
    const nextExcluded = options?.excluded ?? excluded;
    setPlanning(true);
    setError(undefined);
    setReplacement(undefined);
    try {
      const response = await buildItinerary({
        intent: planIntent,
        scope: planScope,
        targetCount: planIntent.targetActivityCount,
        lockedActivityDateIds: nextLocked,
        excludedActivityDateIds: nextExcluded,
      });
      setPlan(response);
      setLocked(nextLocked);
      setExcluded(nextExcluded);
      // Remember the chosen stops so the plan survives a visit to a detail page.
      saveState({
        intent: planIntent,
        scope: planScope,
        request: options?.base?.request ?? request,
        locked: response.activities?.map((item) => item.date.id) ?? nextLocked,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not build a plan.");
    } finally {
      setPlanning(false);
    }
  }

  function addToPlan(id: string) {
    void createPlan({
      locked: [...new Set([...locked, id])],
      excluded: excluded.filter((value) => value !== id),
    });
  }

  function dropFromPlan(id: string) {
    void createPlan({
      locked: locked.filter((value) => value !== id),
      excluded: [...new Set([...excluded, id])],
    });
  }

  function toggleKeep(id: string) {
    setLocked((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  async function prepareReplacement(id: string) {
    if (!intent || !plan?.activities) return;
    const keep = locked.filter((dateId) => dateId !== id);
    const currentIds = new Set(plan.activities.map((item) => item.date.id));
    const candidates = (result?.items ?? []).filter(
      (item) => !currentIds.has(item.date.id) && !excluded.includes(item.date.id),
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
            ![...keep, candidate.date.id].every((dateId) => returnedIds.has(dateId))
          )
            return undefined;
          return {
            candidate,
            plan: candidatePlan,
            travelDelta:
              (candidatePlan.totalTravelMinutes ?? 0) - (plan.totalTravelMinutes ?? 0),
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
    const activities = (plan?.activities ?? []).filter((item) => item.date.id !== id);
    setPlan((current) =>
      current
        ? {
            ...current,
            status: "partial",
            message: "Add another activity or rebuild the plan.",
            activities,
            travelSegments: [],
          }
        : current,
    );
    setLocked((current) => current.filter((value) => value !== id));
    setExcluded((current) => [...new Set([...current, id])]);
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
        requestError instanceof Error ? requestError.message : "Calendar export failed.",
      );
    }
  }

  function updateIntent(next: DiscoveryIntent) {
    void applyIntent(next, scope);
  }

  function submitRequest(value: string) {
    setRequest(value);
    setEditingRequest(false);
    void parsePrompt(value);
  }

  const dayTitle = planTitle(intent, scope, plan);
  const busy = parsing || loading;

  return (
    <main className="pb-28 lg:pb-0">
      <h1 className="sr-only">Plan my day</h1>
      <section className="border-b bg-card">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3 px-[18px] py-3.5 md:gap-4 md:px-8 md:py-6">
          {editingRequest || !request ? (
            <RequestEditor
              initial={request}
              busy={busy}
              onSubmit={submitRequest}
              onCancel={request ? () => setEditingRequest(false) : undefined}
            />
          ) : (
            <div className="flex items-center gap-3.5 rounded-[12px] border border-line bg-field px-3.5 py-3 md:rounded-[14px] md:px-[18px] md:py-3.5">
              <p className="flex-1 text-sm leading-[1.45] md:text-base">{request}</p>
              <button
                type="button"
                onClick={() => setEditingRequest(true)}
                className="text-[13px] font-semibold text-action md:rounded-full md:bg-secondary md:px-[18px] md:py-[9px] md:text-sm md:font-medium md:text-secondary-foreground md:hover:bg-[#E6E3DC]"
              >
                Edit
              </button>
            </div>
          )}

          {parsing ? <StatusLine label="Reading your request…" /> : null}

          {intent ? (
            <ConditionChips
              intent={intent}
              scope={scope}
              disabled={busy}
              formOpen={formOpen}
              onChange={updateIntent}
              onToggleForm={() => {
                setDraft(intent);
                setFormOpen((open) => !open);
              }}
            />
          ) : null}

          {formOpen ? (
            <IntentForm
              key={JSON.stringify(draft)}
              intent={draft}
              busy={loading}
              onApply={(next) => void applyIntent(next, scope)}
              onCancel={intent ? () => setFormOpen(false) : undefined}
            />
          ) : null}

          {notice ? <p className="text-[13px] text-meta">{notice}</p> : null}
          {error ? (
            <p className="rounded-[12px] bg-cancelled/60 px-4 py-3 text-sm text-cancelled-foreground">
              {error}
            </p>
          ) : null}
        </div>
      </section>

      {loading ? (
        <div className="mx-auto max-w-[1120px] px-[18px] pt-4 md:px-8">
          <StatusLine label="Finding activities that fit…" />
        </div>
      ) : null}

      {result && intent && !loading ? (
        <div className="mx-auto grid max-w-[1120px] gap-6 px-[18px] pt-4 pb-6 md:px-8 md:pt-6 md:pb-8 lg:grid-cols-[minmax(0,1fr)_372px] lg:items-start">
          <section aria-labelledby="matches-heading" className="flex min-w-0 flex-col gap-2.5 md:gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="matches-heading" className="text-[17px] md:text-xl">
                {result.items.length} {result.items.length === 1 ? "activity matches" : "activities match"}
              </h2>
              <span className="hidden text-sm text-meta md:inline">
                Ranked by fit · travel from your last stop
              </span>
            </div>

            {result.items.map((item) => (
              <RecommendationCard
                key={item.date.id}
                item={item}
                intent={intent}
                scope={scope}
                added={plannedActivityDateIds.has(item.date.id)}
                busy={planning}
                onAdd={() => addToPlan(item.date.id)}
                onRemove={() => dropFromPlan(item.date.id)}
              />
            ))}

            {result.relaxationSuggestions.length ? (
              <Relaxations
                matched={result.items.length}
                suggestions={result.relaxationSuggestions}
                onUse={(next) => void applyIntent(next, scope)}
              />
            ) : result.items.length === 0 ? (
              <p className="rounded-[14px] border border-dashed border-[#C9C6BE] bg-[#FBFAF7] px-[18px] py-3.5 text-sm leading-normal text-body">
                No published activities fit the full date and time window. Remove
                a condition or try another day.
              </p>
            ) : null}
          </section>

          <aside ref={planPanel} id="your-plan" className="scroll-mt-4 lg:sticky lg:top-5">
            <PlanPanel
              title={dayTitle}
              intent={intent}
              plan={plan}
              planning={planning}
              locked={locked}
              replacement={replacement}
              hasMatches={result.items.length > 0}
              onBuild={() => void createPlan()}
              onToggleKeep={toggleKeep}
              onReplace={(id) => void prepareReplacement(id)}
              onConfirmReplacement={confirmReplacement}
              onCancelReplacement={() => setReplacement(undefined)}
              onExport={() => void exportCalendar()}
              onRemove={removeActivity}
            />
          </aside>
        </div>
      ) : null}

      {result && intent && !loading ? (
        <MobilePlanBar
          title={dayTitle}
          plan={plan}
          planning={planning}
          disabled={result.items.length === 0}
          onBuild={() => void createPlan()}
          onView={() => planPanel.current?.scrollIntoView({ behavior: "smooth" })}
        />
      ) : null}

    </main>
  );
}

function RequestEditor({
  initial,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: string;
  busy: boolean;
  onSubmit: (value: string) => void;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState(initial);
  function submit(event: FormEvent) {
    event.preventDefault();
    const text = value.trim();
    if (text) onSubmit(text);
  }
  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-[14px] border border-primary bg-card p-3.5 md:flex-row md:items-end md:px-[18px]"
    >
      <label htmlFor="plan-request-edit" className="sr-only">
        Describe your day
      </label>
      <textarea
        id="plan-request-edit"
        autoFocus
        rows={2}
        maxLength={500}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder="Saturday from 12 to 5 with the kids. Something indoors, preferably free, and we like crafts and science."
        className="min-w-0 flex-1 resize-none bg-transparent text-[15px] leading-[1.45] outline-none placeholder:text-muted-foreground md:text-base"
      />
      <div className="flex shrink-0 gap-2">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-secondary px-[18px] py-[9px] text-sm font-medium text-secondary-foreground"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="flex-1 rounded-full bg-action px-[22px] py-[9px] text-sm font-semibold text-white hover:bg-action-hover disabled:opacity-60 md:flex-none"
        >
          Plan my day
        </button>
      </div>
    </form>
  );
}

function ConditionChips({
  intent,
  scope,
  disabled,
  formOpen,
  onChange,
  onToggleForm,
}: {
  intent: DiscoveryIntent;
  scope: DiscoverySearchScope;
  disabled: boolean;
  formOpen: boolean;
  onChange: (intent: DiscoveryIntent) => void;
  onToggleForm: () => void;
}) {
  const required = intent.required;
  const preferred = intent.preferred;
  const must: Array<{ label: string; remove?: () => void }> = [
    { label: whenLabel(intent, scope) },
    ...(required.familyFriendly
      ? [
          {
            label: "Family friendly",
            remove: () =>
              onChange({ ...intent, required: { ...required, familyFriendly: false } }),
          },
        ]
      : []),
    ...(required.environment
      ? [
          {
            label: environmentLabel(required.environment),
            remove: () =>
              onChange({ ...intent, required: { ...required, environment: undefined } }),
          },
        ]
      : []),
    ...(required.freeOnly
      ? [
          {
            label: "Free",
            remove: () =>
              onChange({ ...intent, required: { ...required, freeOnly: false } }),
          },
        ]
      : []),
  ];
  const nice: Array<{ label: string; remove: () => void }> = [
    ...(preferred.free && !required.freeOnly
      ? [
          {
            label: "Free",
            remove: () =>
              onChange({ ...intent, preferred: { ...preferred, free: false } }),
          },
        ]
      : []),
    ...preferred.interests.map((interest) => ({
      label: titleCase(interest),
      remove: () =>
        onChange({
          ...intent,
          preferred: {
            ...preferred,
            interests: preferred.interests.filter((value) => value !== interest),
          },
        }),
    })),
    ...(preferred.suburb
      ? [
          {
            label: preferred.suburb,
            remove: () =>
              onChange({ ...intent, preferred: { ...preferred, suburb: undefined } }),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-2.5 md:gap-3">
      <ChipRow label="Must have">
        {must.map((chip) => (
          <ConditionChip
            key={chip.label}
            tone="required"
            disabled={disabled}
            onRemove={chip.remove}
            onClick={chip.remove ? undefined : onToggleForm}
          >
            {chip.label}
          </ConditionChip>
        ))}
        <button
          type="button"
          onClick={onToggleForm}
          aria-expanded={formOpen}
          className="rounded-full border border-dashed border-[#C9C6BE] px-3 py-1.5 text-[13px] text-meta hover:border-[#9A9DA4] hover:text-foreground md:px-3.5 md:py-[7px] md:text-sm"
        >
          {formOpen ? "Close conditions" : "+ Add condition"}
        </button>
      </ChipRow>
      {nice.length ? (
        <ChipRow label="Nice to have">
          {nice.map((chip) => (
            <ConditionChip
              key={chip.label}
              tone="preferred"
              disabled={disabled}
              onRemove={chip.remove}
            >
              {chip.label}
            </ConditionChip>
          ))}
          {preferred.free && !required.freeOnly ? (
            <span className="text-[13px] text-meta md:ml-1">
              “Free” is ranking only —{" "}
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onChange({
                    ...intent,
                    required: { ...required, freeOnly: true },
                    preferred: { ...preferred, free: false },
                  })
                }
                className="font-medium text-action hover:text-action-hover hover:underline"
              >
                make it required
              </button>{" "}
              to filter.
            </span>
          ) : null}
        </ChipRow>
      ) : null}
    </div>
  );
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 md:gap-2.5">
      <span className="w-full text-xs font-bold tracking-[0.1em] text-muted-foreground uppercase md:w-auto md:text-[13px]">
        {label}
      </span>
      {children}
    </div>
  );
}

function ConditionChip({
  tone,
  disabled,
  onRemove,
  onClick,
  children,
}: {
  tone: "required" | "preferred";
  disabled: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  children: string;
}) {
  const className = cn(
    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium md:px-3.5 md:py-[7px] md:text-sm",
    tone === "required" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground",
  );
  if (!onRemove) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={className}>
        {children}
      </button>
    );
  }
  return (
    <span className={className}>
      {children}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${children}`}
        className={cn(
          "-mr-1 grid size-4 place-items-center rounded-full",
          tone === "required" ? "text-[#9A9DA4] hover:text-white" : "opacity-55 hover:opacity-100",
        )}
      >
        <X className="size-3.5" />
      </button>
    </span>
  );
}

function IntentForm({
  intent: initial,
  busy,
  onApply,
  onCancel,
}: {
  intent: DiscoveryIntent;
  busy: boolean;
  onApply: (intent: DiscoveryIntent) => void;
  onCancel?: () => void;
}) {
  const [intent, setIntent] = useState(initial);
  const [interests, setInterests] = useState(initial.preferred.interests.join(", "));
  const field =
    "h-10 w-full rounded-[10px] border border-line bg-card px-3 text-sm outline-none focus:ring-3 focus:ring-ring/30";
  const price = intent.required.freeOnly
    ? "only-free"
    : intent.preferred.free
      ? "prefer-free"
      : "any";

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

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-[14px] border bg-sunken p-4 md:p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Date">
          <input
            className={field}
            type="date"
            required
            value={intent.date}
            onChange={(e) => setIntent({ ...intent, date: e.target.value })}
          />
        </Field>
        <Field label="From">
          <input
            className={field}
            type="time"
            required
            value={intent.availableFrom}
            onChange={(e) => setIntent({ ...intent, availableFrom: e.target.value })}
          />
        </Field>
        <Field label="To">
          <input
            className={field}
            type="time"
            required
            value={intent.availableTo}
            onChange={(e) => setIntent({ ...intent, availableTo: e.target.value })}
          />
        </Field>
        <Field label="Stops">
          <select
            className={field}
            value={intent.targetActivityCount}
            onChange={(e) =>
              setIntent({ ...intent, targetActivityCount: Number(e.target.value) as 2 | 3 })
            }
          >
            <option value={2}>2 activities</option>
            <option value={3}>3 activities</option>
          </select>
        </Field>
        <Field label="Indoors or outdoors">
          <select
            className={field}
            value={intent.required.environment ?? ""}
            onChange={(e) =>
              setIntent({
                ...intent,
                required: {
                  ...intent.required,
                  environment: (e.target.value || undefined) as ActivityEnvironment | undefined,
                },
              })
            }
          >
            <option value="">Either</option>
            <option value="indoor">Must be indoors</option>
            <option value="outdoor">Must be outdoors</option>
            <option value="mixed">Must be mixed</option>
          </select>
        </Field>
        <Field label="Price">
          <select
            className={field}
            value={price}
            onChange={(e) =>
              setIntent({
                ...intent,
                required: { ...intent.required, freeOnly: e.target.value === "only-free" },
                preferred: { ...intent.preferred, free: e.target.value === "prefer-free" },
              })
            }
          >
            <option value="any">Any price</option>
            <option value="prefer-free">Prefer free</option>
            <option value="only-free">Free only</option>
          </select>
        </Field>
        <Field label="Preferred suburb">
          <input
            className={field}
            value={intent.preferred.suburb ?? ""}
            placeholder="Hamilton East"
            onChange={(e) =>
              setIntent({
                ...intent,
                preferred: { ...intent.preferred, suburb: e.target.value || undefined },
              })
            }
          />
        </Field>
        <Field label="Getting around">
          <select
            className={field}
            value={intent.travelMode}
            onChange={(e) =>
              setIntent({ ...intent, travelMode: e.target.value as "driving" | "walking" })
            }
          >
            <option value="driving">Driving</option>
            <option value="walking">Walking</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Interests (nice to have)">
          <input
            className={field}
            value={interests}
            placeholder="crafts, science, music"
            onChange={(e) => setInterests(e.target.value)}
          />
        </Field>
        <label className="flex h-10 items-center gap-2 rounded-[10px] border border-line bg-card px-3 text-sm">
          <input
            type="checkbox"
            className="accent-primary"
            checked={Boolean(intent.required.familyFriendly)}
            onChange={(e) =>
              setIntent({
                ...intent,
                required: { ...intent.required, familyFriendly: e.target.checked },
              })
            }
          />
          Must be family friendly
        </label>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-[18px] py-2.5 text-sm font-medium text-secondary-foreground hover:bg-secondary"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : null}
          Update matches
        </button>
      </div>
    </form>
  );
}

function RecommendationCard({
  item,
  intent,
  scope,
  added,
  busy,
  onAdd,
  onRemove,
}: {
  item: Recommendation;
  intent: DiscoveryIntent;
  scope: DiscoverySearchScope;
  added: boolean;
  busy: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const { activity, date } = item;
  const cost = getCostLabel(activity);
  const venue = activity.venue
    ? [activity.venue.name, activity.venue.suburb].filter(Boolean).join(", ")
    : null;
  const timing =
    date.timing === "flexible" || activity.scheduleMode === "window"
      ? `drop in${activity.visitMinutes ? `, ~${activity.visitMinutes} min` : ""}`
      : "fixed session";
  const time = `${formatTime(date.sourceStartsAt ?? date.startsAt)}–${formatTime(
    date.sourceEndsAt ?? date.endsAt ?? date.startsAt,
  )}`;
  const reasons = item.reasons.map(reasonLabel);
  if (scope === "day") reasons.push(`Inside your ${shortWindow(intent)} window`);

  const action = added ? (
    <button
      type="button"
      onClick={onRemove}
      disabled={busy}
      aria-label={`Remove ${activity.title} from your plan`}
      className="rounded-full border border-primary px-[18px] py-[9px] text-sm font-semibold whitespace-nowrap hover:bg-secondary disabled:opacity-60"
    >
      Added ✓
    </button>
  ) : (
    <button
      type="button"
      onClick={onAdd}
      disabled={busy}
      className="rounded-full bg-action px-[18px] py-[9px] text-sm font-semibold whitespace-nowrap text-white hover:bg-action-hover disabled:opacity-60"
    >
      Add to plan
    </button>
  );

  return (
    <article className="flex flex-col gap-[9px] rounded-[12px] border bg-card px-3.5 py-[13px] md:gap-3 md:rounded-[14px] md:px-[18px] md:py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1 md:gap-1.5">
          <h3 className="text-base tracking-[-0.01em] md:text-[19px] md:tracking-[-0.015em]">
            <Link
              href={activityHref(activity.slug, date.id)}
              className="text-foreground hover:text-foreground hover:underline"
            >
              {activity.title}
            </Link>
          </h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-meta md:gap-x-3 md:text-[13px]">
            <span>
              {time}
              <span className="hidden md:inline"> · {timing}</span>
            </span>
            <CategoryLabel category={activity.category} />
            {venue ? <span className="hidden md:inline">{venue}</span> : null}
            {cost ? (
              <span
                className={cn(
                  "font-semibold md:hidden",
                  cost.free ? "text-free-foreground" : "text-secondary-foreground",
                )}
              >
                {cost.label}
              </span>
            ) : null}
          </div>
          {venue ? <span className="text-xs text-meta md:hidden">{venue}</span> : null}
        </div>
        <div className="hidden shrink-0 items-center gap-2.5 md:flex">
          {cost ? <CostPill cost={cost} /> : null}
          {action}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 md:gap-2">
        {reasons.map((reason) => (
          <span
            key={reason}
            className="rounded-[7px] bg-[#F4F6FF] px-[9px] py-1 text-xs text-accent-foreground md:rounded-[8px] md:px-[11px] md:py-[5px] md:text-[13px]"
          >
            {reason}
          </span>
        ))}
        {item.unmetPreferences.map((unmet) => (
          <span
            key={unmet.code}
            className="rounded-[7px] bg-[#FBF1E6] px-[9px] py-1 text-xs text-[#8A5A12] md:rounded-[8px] md:px-[11px] md:py-[5px] md:text-[13px]"
          >
            {unmetLabel(unmet, activity)}
          </span>
        ))}
      </div>
      <div className="md:hidden [&>button]:w-full [&>button]:py-2.5">{action}</div>
    </article>
  );
}

function Relaxations({
  matched,
  suggestions,
  onUse,
}: {
  matched: number;
  suggestions: RecommendationResponse["relaxationSuggestions"];
  onUse: (intent: DiscoveryIntent) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.code}
          className="flex flex-col gap-3 rounded-[14px] border border-dashed border-[#C9C6BE] bg-[#FBFAF7] px-[18px] py-3.5 md:flex-row md:items-center md:gap-3.5"
        >
          <p className="text-sm leading-normal text-body">
            {matched === 0 ? "Nothing matches every condition." : `Only ${matched} match all conditions.`}{" "}
            {suggestion.label} would give{" "}
            <b className="font-semibold">{suggestion.count}</b>.
          </p>
          <button
            type="button"
            onClick={() => onUse(suggestion.intent)}
            className="w-fit rounded-full border border-primary px-4 py-2 text-sm font-semibold whitespace-nowrap hover:bg-primary hover:text-primary-foreground md:ml-auto"
          >
            {suggestion.label}
          </button>
        </div>
      ))}
    </div>
  );
}

function PlanPanel({
  title,
  intent,
  plan,
  planning,
  locked,
  replacement,
  hasMatches,
  onBuild,
  onToggleKeep,
  onReplace,
  onConfirmReplacement,
  onCancelReplacement,
  onExport,
  onRemove,
}: {
  title: string;
  intent: DiscoveryIntent;
  plan?: ItineraryResponse;
  planning: boolean;
  locked: string[];
  replacement?: ReplacementState;
  hasMatches: boolean;
  onBuild: () => void;
  onToggleKeep: (id: string) => void;
  onReplace: (id: string) => void;
  onConfirmReplacement: (option: ReplacementOption) => void;
  onCancelReplacement: () => void;
  onExport: () => void;
  onRemove: (id: string) => void;
}) {
  const stops = plan?.activities ?? [];
  const last = stops.at(-1);

  return (
    <section
      aria-labelledby="plan-heading"
      className="flex flex-col gap-4 rounded-[16px] border bg-card p-5"
    >
      <div className="flex items-baseline justify-between">
        <h2 id="plan-heading" className="text-lg">
          {title}
        </h2>
        <span className="text-[13px] text-muted-foreground">
          {stops.length} {stops.length === 1 ? "stop" : "stops"}
        </span>
      </div>

      {!plan ? (
        <>
          <p className="text-sm leading-normal text-body">
            Add activities you like, or let us pick a {intent.targetActivityCount}-stop day
            that fits your window and travel time.
          </p>
          <button
            type="button"
            disabled={planning || !hasMatches}
            onClick={onBuild}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-[15px] font-semibold text-primary-foreground disabled:opacity-60"
          >
            {planning ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Build my plan
          </button>
        </>
      ) : (
        <>
          {plan.status !== "complete" || !stops.length ? (
            <p className="text-sm text-body">{plan.message}</p>
          ) : null}
          {stops.length ? (
            <ol className="flex flex-col">
              {stops.map((item, index) => {
                const cost = getCostLabel(item.activity);
                const segment = plan.travelSegments?.[index];
                return (
                  <li key={item.date.id}>
                    <div className="grid grid-cols-[52px_1fr] gap-3">
                      <span className="pt-0.5 text-sm font-semibold">
                        {formatTime(item.date.startsAt)}
                      </span>
                      <div
                        className={cn(
                          "-ml-1.5 flex flex-col gap-1 border-l-2 border-border pl-3.5",
                          (segment || index < stops.length - 1) && "pb-3.5",
                        )}
                      >
                        <span className="text-[15px] font-semibold">{item.activity.title}</span>
                        <span className="text-[13px] text-meta">
                          {[
                            item.activity.venue?.name ?? "Venue not listed",
                            cost?.label,
                            item.date.durationEstimated && item.activity.visitMinutes
                              ? `drop in, ~${item.activity.visitMinutes} min`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5 text-[13px]">
                          <StopAction onClick={() => onToggleKeep(item.date.id)}>
                            {locked.includes(item.date.id) ? "Kept ✓" : "Keep"}
                          </StopAction>
                          <StopAction onClick={() => onReplace(item.date.id)}>Replace</StopAction>
                          <StopAction onClick={() => onRemove(item.date.id)}>Remove</StopAction>
                        </div>
                        {replacement?.targetId === item.date.id ? (
                          <ReplacementPicker
                            replacement={replacement}
                            onConfirm={onConfirmReplacement}
                            onCancel={onCancelReplacement}
                          />
                        ) : null}
                      </div>
                    </div>
                    {segment ? <TravelRow segment={segment} /> : null}
                  </li>
                );
              })}
            </ol>
          ) : null}

          {stops.length ? (
            <dl className="flex flex-col gap-1.5 rounded-[12px] bg-sunken p-3.5 text-[13px] text-body">
              <SummaryRow label="Finishes">
                {last?.date.endsAt ? formatTime(last.date.endsAt) : "—"}
              </SummaryRow>
              <SummaryRow label="Known entry cost">
                {plan.knownEntryCost === undefined
                  ? "—"
                  : `${formatMoney(plan.knownEntryCost)}${plan.hasUnknownCosts ? " + unlisted" : ""}`}
              </SummaryRow>
              <SummaryRow label="Total travel">
                {plan.totalTravelMinutes ?? 0} min (estimate)
              </SummaryRow>
            </dl>
          ) : null}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={plan.status !== "complete" || !stops.length}
              onClick={onExport}
              className="rounded-full bg-primary p-3 text-[15px] font-semibold text-primary-foreground disabled:opacity-50"
            >
              Add to calendar (.ics)
            </button>
            <button
              type="button"
              disabled={planning}
              onClick={onBuild}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-line p-3 text-[15px] font-medium text-secondary-foreground hover:bg-secondary disabled:opacity-60"
            >
              {planning ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Rebuild plan
            </button>
          </div>
        </>
      )}

      <p className="text-xs leading-normal text-muted-foreground">
        Travel times are straight-line estimates. Confirm details with the
        organiser before you go.
      </p>
    </section>
  );
}

function StopAction({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-medium text-action hover:text-action-hover hover:underline"
    >
      {children}
    </button>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd className="font-semibold text-foreground">{children}</dd>
    </div>
  );
}

function TravelRow({ segment }: { segment: TravelSegment }) {
  return (
    <div className="grid grid-cols-[52px_1fr] gap-3">
      <span />
      <div className="-ml-1.5 border-l-2 border-dashed border-[#D4D2CB] pb-3.5 pl-3.5 text-[13px] text-muted-foreground">
        {segment.estimatedMinutes} min {segment.mode === "walking" ? "walk" : "drive"}
        {segment.freeMinutes ? ` · ${segment.freeMinutes} min free before the next start` : ""}
      </div>
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
    <div className="mt-2 flex flex-col gap-2 rounded-[12px] border bg-sunken p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
          Fits in its place
        </span>
        <button type="button" onClick={onCancel} className="text-xs font-medium text-action">
          Cancel
        </button>
      </div>
      {replacement.loading ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <LoaderCircle className="size-3.5 animate-spin" /> Checking times and travel…
        </p>
      ) : null}
      {replacement.error ? <p className="text-xs text-muted-foreground">{replacement.error}</p> : null}
      {replacement.options.map((option) => {
        const cost = getCostLabel(option.candidate.activity);
        return (
          <button
            key={option.candidate.date.id}
            type="button"
            onClick={() => onConfirm(option)}
            className="flex flex-col gap-0.5 rounded-[8px] border bg-card p-2.5 text-left hover:border-primary"
          >
            <span className="text-sm font-semibold">{option.candidate.activity.title}</span>
            <span className="text-xs text-meta">
              {formatTime(option.candidate.date.startsAt)}
              {cost ? ` · ${cost.label}` : ""} · travel{" "}
              {option.travelDelta === 0
                ? "unchanged"
                : `${option.travelDelta > 0 ? "+" : ""}${option.travelDelta} min`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MobilePlanBar({
  title,
  plan,
  planning,
  disabled,
  onBuild,
  onView,
}: {
  title: string;
  plan?: ItineraryResponse;
  planning: boolean;
  disabled: boolean;
  onBuild: () => void;
  onView: () => void;
}) {
  const stops = plan?.activities ?? [];
  const first = stops[0];
  const last = stops.at(-1);
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3.5 bg-primary px-[18px] py-3.5 text-primary-foreground lg:hidden">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] font-semibold">
          {title} · {stops.length} {stops.length === 1 ? "stop" : "stops"}
        </span>
        <span className="truncate text-xs text-[#A9ACB2]">
          {first && last
            ? [
                `${formatTime(first.date.startsAt)} – ${last.date.endsAt ? formatTime(last.date.endsAt) : ""}`,
                plan?.knownEntryCost !== undefined ? formatMoney(plan.knownEntryCost) : null,
                `${plan?.totalTravelMinutes ?? 0} min travel`,
              ]
                .filter(Boolean)
                .join(" · ")
            : "Add activities or let us build the day"}
        </span>
      </div>
      <button
        type="button"
        disabled={planning || (!plan && disabled)}
        onClick={plan ? onView : onBuild}
        className="shrink-0 rounded-full bg-white px-[18px] py-2.5 text-sm font-semibold whitespace-nowrap text-primary disabled:opacity-60"
      >
        {planning ? "Building…" : plan ? "View plan" : "Build my plan"}
      </button>
    </div>
  );
}

function StatusLine({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-body" role="status">
      <LoaderCircle className="size-4 animate-spin" />
      {label}
    </p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </label>
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

function planTitle(
  intent: DiscoveryIntent | undefined,
  scope: DiscoverySearchScope,
  plan?: ItineraryResponse,
): string {
  const first = plan?.activities?.[0]?.date.startsAt;
  if (first) {
    return `Your ${new Intl.DateTimeFormat("en-NZ", { weekday: "long", timeZone: "Pacific/Auckland" }).format(new Date(first))}`;
  }
  if (!intent || scope !== "day") return "Your plan";
  return `Your ${new Intl.DateTimeFormat("en-NZ", { weekday: "long", timeZone: "Pacific/Auckland" }).format(new Date(`${intent.date}T12:00:00+12:00`))}`;
}

function whenLabel(intent: DiscoveryIntent, scope: DiscoverySearchScope): string {
  if (scope === "weekend") return "This weekend";
  if (scope === "week") return "Next 7 days";
  const day = formatDayLabel(`${intent.date}T12:00:00+12:00`);
  const allDay = intent.availableFrom === "00:00" && intent.availableTo === "23:59";
  return allDay ? `${day} · all day` : `${day} · ${intent.availableFrom}–${intent.availableTo}`;
}

function shortWindow(intent: DiscoveryIntent): string {
  const hour = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    const twelve = h % 12 || 12;
    return m ? `${twelve}:${String(m).padStart(2, "0")}` : String(twelve);
  };
  return `${hour(intent.availableFrom)}–${hour(intent.availableTo)}`;
}

function environmentLabel(environment: ActivityEnvironment): string {
  if (environment === "indoor") return "Indoors";
  if (environment === "outdoor") return "Outdoors";
  if (environment === "mixed") return "Indoor & outdoor";
  return "Any setting";
}

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleCase(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMoney(value: number): string {
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

function reasonLabel(reason: { code: string; value?: string }): string {
  switch (reason.code) {
    case "FREE":
      return "Free";
    case "FAMILY_FRIENDLY":
      return "Family friendly";
    case "ENVIRONMENT_MATCH":
      return environmentLabel(reason.value as ActivityEnvironment);
    case "PREFERRED_SUBURB":
      return reason.value ?? "In your preferred area";
    case "INTEREST_MATCH":
      return `Matches ${(reason.value ?? "")
        .split(",")
        .map((value) => `“${value.replaceAll("-", " ")}”`)
        .join(" and ")}`;
    default:
      return "Matches your preferences";
  }
}

function unmetLabel(
  reason: { code: string; value?: string },
  activity: Recommendation["activity"],
): string {
  if (reason.code === "NOT_FREE") {
    const cost = getCostLabel(activity);
    return cost && !cost.free ? `Not free — ${cost.label.toLowerCase()}` : "Not listed as free";
  }
  if (reason.code === "PREFERRED_SUBURB_NOT_MATCHED") return `Outside ${reason.value}`;
  return "Outside your interests";
}

function saveState(state: SavedPlanState): void {
  sessionStorage.setItem(PLAN_STATE_KEY, JSON.stringify(state));
}
