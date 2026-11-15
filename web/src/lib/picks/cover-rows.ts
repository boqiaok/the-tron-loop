import {
  formatDayLabel,
  formatTime,
  getCostLabel,
  type CostLabel,
} from "../activities/format";
import type { WeeklyGuide } from "@/types/weekly-guide";

/** The cover lists this many picks; the rest are counted, not shown. */
export const COVER_MAX_ROWS = 7;

export interface CoverRow {
  position: number;
  title: string;
  /** One sentence on what it is. */
  blurb: string | null;
  /** "Wed 18 Nov, 19:30 · BNZ Theatre". */
  details: string;
  cost: CostLabel | null;
}

/**
 * What the share cover says about each pick: enough to tell what it is,
 * when and where, and what it costs, without opening the site.
 */
export function toCoverRows(guide: Pick<WeeklyGuide, "items">): {
  rows: CoverRow[];
  more: number;
} {
  const rows = guide.items
    .filter((item) => item.activity.status !== "cancelled")
    .map((item, index) => {
      const { activity } = item;
      const date = activity.dates[0];
      const when = date
        ? `${formatDayLabel(date.startsAt)}, ${date.isAllDay ? "All day" : formatTime(date.startsAt)}`
        : null;
      const venue = activity.venue?.name.split(" - ")[0].trim() || null;
      return {
        position: index + 1,
        title: activity.title,
        blurb: activity.blurb,
        details: [when, venue].filter(Boolean).join(" · "),
        cost: getCostLabel(activity),
      };
    });

  return {
    rows: rows.slice(0, COVER_MAX_ROWS),
    more: Math.max(0, rows.length - COVER_MAX_ROWS),
  };
}
