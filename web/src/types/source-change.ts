import type { AdminActivity } from "@/lib/api/admin-activities";

export type SourceChangeKind =
  | "cancelled"
  | "dates_removed"
  | "venue"
  | "title"
  | "cost"
  | "unlisted";

export interface SourceChange {
  kind: SourceChangeKind;
  before: string | null;
  after: string | null;
  /** For removed dates or an unlisted activity, the start times affected. */
  dates: string[];
}

export interface ChangedActivity {
  activity: AdminActivity;
  changes: SourceChange[];
}
