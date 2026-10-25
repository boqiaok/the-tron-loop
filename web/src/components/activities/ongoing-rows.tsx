"use client";

import { useState } from "react";

import { ActivityRow } from "@/components/activities/activity-row";
import type { Occurrence } from "@/lib/activities/occurrences";

const COLLAPSED_ROWS = 3;

/** The first few ongoing rows, with a button that shows the rest. */
export function OngoingRows({
  occurrences,
  groupKey,
  recurring,
}: {
  occurrences: Occurrence[];
  groupKey: string;
  recurring: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hidden = occurrences.length - COLLAPSED_ROWS;
  const shown = expanded || hidden <= 0 ? occurrences : occurrences.slice(0, COLLAPSED_ROWS);

  return (
    <>
      {shown.map((occurrence) => (
        <ActivityRow
          key={`${occurrence.date.id}-${groupKey}`}
          occurrence={occurrence}
          recurring={recurring}
        />
      ))}
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="self-start px-0.5 py-1.5 text-sm font-medium text-action hover:text-action-hover hover:underline"
        >
          {expanded ? "Show fewer" : `Show ${hidden} more ongoing`}
        </button>
      ) : null}
    </>
  );
}
