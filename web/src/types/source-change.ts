import type { AdminActivity } from "@/lib/api/admin-activities";

export type SourceChangeKind =
  | "cancelled"
  | "dates_removed"
  | "venue"
  | "title"
  | "cost";

export interface SourceChange {
  kind: SourceChangeKind;
  before: string | null;
  after: string | null;
  /** For removed dates, the start times the source no longer lists. */
  dates: string[];
}

export interface ChangedActivity {
  activity: AdminActivity;
  changes: SourceChange[];
}
