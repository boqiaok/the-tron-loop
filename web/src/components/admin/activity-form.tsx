"use client";

import { AlertCircle, LoaderCircle, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { ActivityStatusBadge } from "@/components/admin/activity-status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  createAdminActivity,
  type ActivityInput,
  updateAdminActivity,
} from "@/lib/api/admin-activities";
import {
  ACTIVITY_TIME_ZONE,
  addMinutesToLocalDateTime,
  createDefaultLocalDate,
  fromAucklandInputValue,
  toAucklandInputValue,
} from "@/lib/dates/admin-date-time";
import { cn } from "@/lib/utils";
import type {
  Activity,
  ActivityCostType,
  ActivityTag,
  Venue,
} from "@/types/activity";

interface DateField {
  key: string;
  startsAt: string;
  endsAt: string;
  isAllDay: boolean;
  recurrenceRule: string;
}

interface FormState {
  title: string;
  summary: string;
  description: string;
  imageUrl: string;
  sourceUrl: string;
  costType: ActivityCostType;
  costAmountFrom: string;
  costDetails: string;
  venueId: string;
  tagIds: string[];
  dates: DateField[];
}

const inputClassName =
  "min-h-10 w-full rounded-md border bg-white px-3 py-2 text-sm shadow-xs outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70";
const labelClassName = "mb-1.5 block text-sm font-medium text-foreground";

export function ActivityForm({
  activity,
  tags,
  venues,
}: {
  activity?: Activity;
  tags: ActivityTag[];
  venues: Venue[];
}) {
  const router = useRouter();
  const readOnly = activity?.status === "cancelled";
  const [form, setForm] = useState<FormState>(() => createInitialState(activity));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateDate(key: string, changes: Partial<DateField>) {
    setForm((current) => ({
      ...current,
      dates: current.dates.map((date) =>
        date.key === key ? { ...date, ...changes } : date,
      ),
    }));
  }

  function changeStart(date: DateField, startsAt: string) {
    let endsAt = date.endsAt;

    if (startsAt && date.startsAt && date.endsAt && !date.isAllDay) {
      const previousStart = new Date(
        fromAucklandInputValue(date.startsAt),
      ).getTime();
      const previousEnd = new Date(
        fromAucklandInputValue(date.endsAt),
      ).getTime();
      const durationMinutes = Math.max(
        60,
        Math.round((previousEnd - previousStart) / 60_000),
      );
      endsAt = addMinutesToLocalDateTime(startsAt, durationMinutes);
    }

    updateDate(date.key, { startsAt, endsAt });
  }

  function toggleAllDay(date: DateField, checked: boolean) {
    const startsAt = checked
      ? date.startsAt.slice(0, 10)
      : `${date.startsAt.slice(0, 10)}T09:00`;

    updateDate(date.key, {
      isAllDay: checked,
      startsAt,
      endsAt: checked ? "" : addMinutesToLocalDateTime(startsAt, 60),
    });
  }

  function addDate() {
    const startsAt = createDefaultLocalDate();

    setForm((current) => ({
      ...current,
      dates: [
        ...current.dates,
        {
          key: crypto.randomUUID(),
          startsAt,
          endsAt: addMinutesToLocalDateTime(startsAt, 60),
          isAllDay: false,
          recurrenceRule: "",
        },
      ],
    }));
  }

  function removeDate(key: string) {
    setForm((current) => ({
      ...current,
      dates: current.dates.filter((date) => date.key !== key),
    }));
  }

  function toggleTag(tagId: string, checked: boolean) {
    update(
      "tagIds",
      checked
        ? [...form.tagIds, tagId]
        : form.tagIds.filter((id) => id !== tagId),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const input = toActivityInput(form);
      const saved = activity
        ? await updateAdminActivity(activity.id, input)
        : await createAdminActivity(input);
      router.push(`/admin/activities?status=${saved.status}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the activity.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {activity ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-white px-4 py-3 text-sm">
          <span className="text-muted-foreground">Current status</span>
          <ActivityStatusBadge status={activity.status} />
          {readOnly ? (
            <span className="text-muted-foreground">
              Cancelled activities are kept as read-only records.
            </span>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive" className="p-4">
          <AlertCircle />
          <AlertTitle>Could not save this activity</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <FormSection
        title="Activity details"
        description="The main information visitors will see in the weekly guide."
      >
        <div>
          <label htmlFor="title" className={labelClassName}>
            Title <Required />
          </label>
          <input
            id="title"
            className={inputClassName}
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            maxLength={200}
            required
            disabled={readOnly}
          />
          {!activity ? (
            <p className="mt-1 text-xs text-muted-foreground">
              The URL slug is generated automatically from this title.
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="summary" className={labelClassName}>
            Summary
          </label>
          <textarea
            id="summary"
            className={cn(inputClassName, "min-h-20 resize-y")}
            value={form.summary}
            onChange={(event) => update("summary", event.target.value)}
            maxLength={500}
            disabled={readOnly}
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {form.summary.length}/500
          </p>
        </div>

        <div>
          <label htmlFor="description" className={labelClassName}>
            Description <Required />
          </label>
          <textarea
            id="description"
            className={cn(inputClassName, "min-h-36 resize-y")}
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            required
            disabled={readOnly}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="imageUrl" className={labelClassName}>
              Image URL
            </label>
            <input
              id="imageUrl"
              className={inputClassName}
              type="text"
              inputMode="url"
              pattern="(?:https?://.+|/images/.+)"
              title="Enter an HTTP(S) URL or a local path beginning with /images/."
              placeholder="/images/activities/activity.jpg"
              value={form.imageUrl}
              onChange={(event) => update("imageUrl", event.target.value)}
              disabled={readOnly}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Use a local <code>/images/...</code> path or a complete HTTP(S)
              URL.
            </p>
          </div>
          <div>
            <label htmlFor="sourceUrl" className={labelClassName}>
              Source URL
            </label>
            <input
              id="sourceUrl"
              className={inputClassName}
              type="url"
              placeholder="https://example.com/event"
              value={form.sourceUrl}
              onChange={(event) => update("sourceUrl", event.target.value)}
              disabled={readOnly}
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Dates"
        description={`Times are entered in ${ACTIVITY_TIME_ZONE}. Add each occurrence that should appear in the guide.`}
      >
        <div className="space-y-4">
          {form.dates.map((date, index) => (
            <fieldset
              key={date.key}
              className="rounded-lg border bg-muted/20 p-4"
              disabled={readOnly}
            >
              <div className="flex items-center justify-between gap-3">
                <legend className="font-semibold">Date {index + 1}</legend>
                {form.dates.length > 1 && !readOnly ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDate(date.key)}
                  >
                    <Trash2 />
                    Remove
                  </Button>
                ) : null}
              </div>

              <label className="mt-4 flex w-fit items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={date.isAllDay}
                  onChange={(event) => toggleAllDay(date, event.target.checked)}
                  className="size-4 accent-primary"
                />
                All-day activity
              </label>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor={`starts-${date.key}`} className={labelClassName}>
                    Starts <Required />
                  </label>
                  <input
                    id={`starts-${date.key}`}
                    className={inputClassName}
                    type={date.isAllDay ? "date" : "datetime-local"}
                    value={date.startsAt}
                    onChange={(event) =>
                      changeStart(date, event.target.value)
                    }
                    required
                  />
                </div>
                <div>
                  <label htmlFor={`ends-${date.key}`} className={labelClassName}>
                    Ends
                  </label>
                  <input
                    id={`ends-${date.key}`}
                    className={inputClassName}
                    type={date.isAllDay ? "date" : "datetime-local"}
                    value={date.endsAt}
                    min={date.startsAt}
                    onChange={(event) =>
                      updateDate(date.key, { endsAt: event.target.value })
                    }
                    aria-invalid={hasInvalidEnd(date) || undefined}
                  />
                  {hasInvalidEnd(date) ? (
                    <p className="mt-1 text-xs text-destructive">
                      End time must be later than the start time.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4">
                <label
                  htmlFor={`recurrence-${date.key}`}
                  className={labelClassName}
                >
                  Recurrence rule
                </label>
                <input
                  id={`recurrence-${date.key}`}
                  className={inputClassName}
                  placeholder="Optional, for example: FREQ=WEEKLY;COUNT=4"
                  value={date.recurrenceRule}
                  onChange={(event) =>
                    updateDate(date.key, { recurrenceRule: event.target.value })
                  }
                />
              </div>
            </fieldset>
          ))}
        </div>

        {!readOnly ? (
          <Button type="button" variant="outline" onClick={addDate}>
            <Plus />
            Add another date
          </Button>
        ) : null}
      </FormSection>

      <FormSection
        title="Location and tags"
        description="These options come from the existing venue and tag records."
      >
        <div>
          <label htmlFor="venue" className={labelClassName}>
            Venue
          </label>
          <select
            id="venue"
            className={inputClassName}
            value={form.venueId}
            onChange={(event) => update("venueId", event.target.value)}
            disabled={readOnly}
          >
            <option value="">No venue</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
                {venue.suburb ? ` — ${venue.suburb}` : ""}
              </option>
            ))}
          </select>
        </div>

        <fieldset disabled={readOnly}>
          <legend className={labelClassName}>Tags</legend>
          {tags.length ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {tags.map((tag) => (
                <label
                  key={tag.id}
                  className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={form.tagIds.includes(tag.id)}
                    onChange={(event) => toggleTag(tag.id, event.target.checked)}
                    className="size-4 accent-primary"
                  />
                  {tag.name}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No tags exist yet. Tags can be added through the API.
            </p>
          )}
        </fieldset>
      </FormSection>

      <FormSection
        title="Cost"
        description="Use a simple cost category, with optional price details."
      >
        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <label htmlFor="costType" className={labelClassName}>
              Cost type
            </label>
            <select
              id="costType"
              className={inputClassName}
              value={form.costType}
              onChange={(event) =>
                update("costType", event.target.value as ActivityCostType)
              }
              disabled={readOnly}
            >
              <option value="unknown">Unknown</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <label htmlFor="costAmount" className={labelClassName}>
              Price from (NZD)
            </label>
            <input
              id="costAmount"
              className={inputClassName}
              type="number"
              min="0"
              step="0.01"
              value={form.costAmountFrom}
              onChange={(event) => update("costAmountFrom", event.target.value)}
              disabled={readOnly}
            />
          </div>
          <div>
            <label htmlFor="costDetails" className={labelClassName}>
              Cost details
            </label>
            <input
              id="costDetails"
              className={inputClassName}
              maxLength={255}
              placeholder="Adult $20, child $10"
              value={form.costDetails}
              onChange={(event) => update("costDetails", event.target.value)}
              disabled={readOnly}
            />
          </div>
        </div>
      </FormSection>

      <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 rounded-xl border bg-white/95 p-4 shadow-lg backdrop-blur">
        <Link
          href="/admin/activities"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          {readOnly
            ? "Back to activities"
            : activity
              ? "Discard changes"
              : "Back without saving"}
        </Link>
        {!readOnly ? (
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? <LoaderCircle className="animate-spin" /> : null}
            {activity ? "Save changes" : "Save draft"}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function FormSection({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="rounded-xl border bg-white p-5 shadow-sm sm:p-6">
      <div className="border-b pb-4">
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Required() {
  return <span className="text-destructive">*</span>;
}

function createInitialState(activity?: Activity): FormState {
  const defaultStartsAt = createDefaultLocalDate();

  return {
    title: activity?.title ?? "",
    summary: activity?.summary ?? "",
    description: activity?.description ?? "",
    imageUrl: activity?.imageUrl ?? "",
    sourceUrl: activity?.sourceUrl ?? "",
    costType: activity?.costType ?? "unknown",
    costAmountFrom:
      activity?.costAmountFrom === null || activity?.costAmountFrom === undefined
        ? ""
        : String(activity.costAmountFrom),
    costDetails: activity?.costDetails ?? "",
    venueId: activity?.venue?.id ?? "",
    tagIds: activity?.tags.map((tag) => tag.id) ?? [],
    dates: activity?.dates.length
      ? activity.dates.map((date) => ({
          key: date.id,
          startsAt: toAucklandInputValue(date.startsAt, date.isAllDay),
          endsAt: date.endsAt
            ? toAucklandInputValue(date.endsAt, date.isAllDay)
            : "",
          isAllDay: date.isAllDay,
          recurrenceRule: date.recurrenceRule ?? "",
        }))
      : [
          {
            key: "initial-date",
            startsAt: defaultStartsAt,
            endsAt: addMinutesToLocalDateTime(defaultStartsAt, 60),
            isAllDay: false,
            recurrenceRule: "",
          },
        ],
  };
}

function toActivityInput(form: FormState): ActivityInput {
  if (!form.dates.length) throw new Error("Add at least one activity date.");

  const dates = form.dates.map((date) => {
    const startsAt = fromAucklandInputValue(date.startsAt);
    const endsAt = date.endsAt
      ? fromAucklandInputValue(date.endsAt)
      : null;

    if (endsAt && new Date(endsAt) <= new Date(startsAt)) {
      throw new Error("An end time must be later than its start time.");
    }

    return {
      startsAt,
      endsAt,
      timezone: ACTIVITY_TIME_ZONE,
      isAllDay: date.isAllDay,
      recurrenceRule: emptyToNull(date.recurrenceRule),
    };
  });

  return {
    title: form.title.trim(),
    summary: emptyToNull(form.summary),
    description: form.description.trim(),
    imageUrl: emptyToNull(form.imageUrl),
    sourceUrl: emptyToNull(form.sourceUrl),
    costType: form.costType,
    costAmountFrom:
      form.costAmountFrom === "" ? null : Number(form.costAmountFrom),
    currency: "NZD",
    costDetails: emptyToNull(form.costDetails),
    venueId: form.venueId || null,
    dates,
    tagIds: form.tagIds,
  };
}

function emptyToNull(value: string): string | null {
  return value.trim() || null;
}

function hasInvalidEnd(date: DateField): boolean {
  if (!date.startsAt || !date.endsAt) return false;

  return (
    new Date(fromAucklandInputValue(date.endsAt)) <=
    new Date(fromAucklandInputValue(date.startsAt))
  );
}
