"use client";

import { Check, ChevronDown } from "lucide-react";

import { CategoryDot } from "@/components/activities/category-label";
import { CATEGORIES } from "@/lib/activities/category";
import type { WhatsOnScope } from "@/lib/activities/filters";
import { cn } from "@/lib/utils";
import type {
  ActivityCategory,
  ActivityFilterOptions,
  ActivityFilters,
  WhenFilter,
} from "@/types/activity";

export interface FilterRailProps {
  scope: WhatsOnScope;
  filters: ActivityFilters;
  options?: ActivityFilterOptions;
  onChange: (patch: Partial<ActivityFilters>) => void;
  location: {
    active: boolean;
    locating: boolean;
    error?: string;
    onUse: () => void;
    onStop: () => void;
  };
}

const WHEN_OPTIONS: Array<{ value: WhenFilter; label: string }> = [
  { value: "today", label: "Today" },
  { value: "weekend", label: "Weekend" },
  { value: "evening", label: "Evenings" },
];

export function FilterRail({
  scope,
  filters,
  options,
  onChange,
  location,
}: FilterRailProps) {
  const counts = new Map(
    options?.categories.map((item) => [item.category, item.count]) ?? [],
  );
  const isRegular = scope === "regular";

  function toggleCategory(category: ActivityCategory) {
    onChange({
      categories: filters.categories.includes(category)
        ? filters.categories.filter((value) => value !== category)
        : [...filters.categories, category],
    });
  }

  return (
    <div className="flex flex-col gap-[22px]">
      <RailGroup label="Category">
        <div className="flex flex-col gap-[7px] text-sm text-secondary-foreground">
          {CATEGORIES.map((category) => {
            const checked = filters.categories.includes(category.value);
            return (
              <label
                key={category.value}
                className="flex cursor-pointer items-center gap-[9px] rounded-md py-0.5"
              >
                <span className="relative grid size-4 shrink-0 place-items-center">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCategory(category.value)}
                    className="peer size-4 cursor-pointer appearance-none rounded-[5px] border-[1.5px] border-[#C9C6BE] checked:border-primary checked:bg-primary focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
                  />
                  <Check
                    aria-hidden="true"
                    className="pointer-events-none absolute size-3 stroke-3 text-white opacity-0 peer-checked:opacity-100"
                  />
                </span>
                <CategoryDot color={category.color} className="size-2 md:size-2" />
                {category.label}
                {options ? (
                  <span className="ml-auto text-muted-foreground">
                    {counts.get(category.value) ?? 0}
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      </RailGroup>

      <RailGroup label="Cost">
        <div className="flex gap-1.5" role="radiogroup" aria-label="Cost">
          {(
            [
              ["free", "Free"],
              ["paid", "Paid"],
              [undefined, "Any"],
            ] as const
          ).map(([value, label]) => (
            <RailPill
              key={label}
              role="radio"
              active={filters.costType === value}
              onClick={() => onChange({ costType: value })}
            >
              {label}
            </RailPill>
          ))}
        </div>
      </RailGroup>

      {!isRegular ? (
        <RailGroup label="When">
          <div className="flex flex-wrap gap-1.5">
            {WHEN_OPTIONS.filter(
              (option) => option.value !== "today" || scope === "this-week",
            ).map((option) => (
              <RailPill
                key={option.value}
                active={filters.when === option.value}
                onClick={() =>
                  onChange({
                    when:
                      filters.when === option.value ? undefined : option.value,
                  })
                }
              >
                {option.label}
              </RailPill>
            ))}
          </div>
        </RailGroup>
      ) : null}

      {!isRegular ? (
        <RailGroup label="Where">
          {options?.suburbs.length ? (
            <label className="relative block">
              <span className="sr-only">Suburb</span>
              <select
                value={filters.suburb ?? ""}
                onChange={(event) =>
                  onChange({ suburb: event.target.value || undefined })
                }
                className="h-10 w-full cursor-pointer appearance-none rounded-[10px] border border-line bg-card pr-9 pl-3 text-sm text-body focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                <option value="">All suburbs</option>
                {options.suburbs.map((suburb) => (
                  <option key={suburb} value={suburb}>
                    {suburb}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute top-3 right-3 size-4 text-muted-foreground"
              />
            </label>
          ) : null}
          {location.active ? (
            <p className="text-[13px] text-meta">
              Showing distance from your location.{" "}
              <TextButton onClick={location.onStop}>Stop</TextButton>
            </p>
          ) : (
            <TextButton onClick={location.onUse} disabled={location.locating}>
              {location.locating ? "Finding you…" : "Use my location for distance"}
            </TextButton>
          )}
          {location.error ? (
            <p className="text-xs text-cancelled-foreground">{location.error}</p>
          ) : null}
        </RailGroup>
      ) : null}

      {!isRegular && options ? (
        <div className="flex flex-col gap-2 border-t pt-4">
          {filters.includeCancelled ? (
            <>
              <span className="text-[13px] leading-normal text-meta">
                Cancelled activities are shown, struck through.
              </span>
              <TextButton onClick={() => onChange({ includeCancelled: false })}>
                Hide cancelled
              </TextButton>
            </>
          ) : (
            <>
              <span className="text-[13px] leading-normal text-meta">
                Cancelled activities are hidden.
              </span>
              {options.cancelledCount > 0 ? (
                <TextButton onClick={() => onChange({ includeCancelled: true })}>
                  Show {options.cancelledCount} cancelled
                </TextButton>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function RailGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-2.5">
      <legend className="mb-2.5 text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </legend>
      {children}
    </fieldset>
  );
}

export function RailPill({
  active,
  onClick,
  children,
  role,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  role?: "radio";
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={role ? active : undefined}
      aria-pressed={role ? undefined : active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-[7px] text-[13px] whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
        active
          ? "border-primary bg-primary font-medium text-primary-foreground"
          : "border-line bg-card text-secondary-foreground hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}

export function TextButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-fit text-left text-[13px] font-medium text-action hover:text-action-hover hover:underline disabled:opacity-60"
    >
      {children}
    </button>
  );
}
