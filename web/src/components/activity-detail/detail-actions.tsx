"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { buildActivityIcs } from "@/lib/activities/ics";
import { startPlanAround } from "@/lib/discovery/plan-request";
import { cn } from "@/lib/utils";
import type { Activity, ActivityDate } from "@/types/activity";

export interface PlanSeed {
  title: string;
  dateId: string;
  localDate: string;
  startTime: string;
  endTime: string | null;
}

/** Starts a plan for that day with this activity already in it. */
export function AddToPlanButton({
  seed,
  label = "Add to my plan",
  className,
}: {
  seed: PlanSeed;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        startPlanAround(seed);
        router.push("/plan");
      }}
      className={cn(
        "rounded-full bg-action p-3 text-center text-[15px] font-semibold whitespace-nowrap text-white hover:bg-action-hover",
        className,
      )}
    >
      {label}
    </button>
  );
}

export function CalendarButton({
  activity,
  date,
}: {
  activity: Activity;
  date: ActivityDate;
}) {
  function download() {
    const blob = new Blob([buildActivityIcs(activity, date)], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activity.slug}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={download} className={secondaryButton}>
      Add to calendar (.ics)
    </button>
  );
}

/** Native share sheet where available, otherwise copies the link. */
export function ShareButton({
  title,
  variant = "button",
}: {
  title: string;
  variant?: "button" | "text";
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // The person closed the share sheet.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      className={
        variant === "text"
          ? "text-[13px] text-meta hover:text-foreground"
          : secondaryButton
      }
      aria-live="polite"
    >
      {copied ? "Link copied" : "Share"}
    </button>
  );
}

const secondaryButton =
  "rounded-full border border-line p-3 text-center text-[15px] font-medium text-secondary-foreground hover:bg-secondary";
