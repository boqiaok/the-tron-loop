import type { AdminActivity } from "@/lib/api/admin-activities";
import type { RejectionReason } from "@/types/activity";

export type ReviewGroup = "recommended" | "review" | "skip";

export type ReviewReason =
  | "trusted_source"
  | "previously_published"
  | "one_off"
  | "short_run"
  | "adult"
  | "wellness"
  | "business"
  | "cost_unknown"
  | "unfamiliar_regular"
  | "unverified_long_run"
  | "organizer_rejected"
  | "no_signal"
  | "service"
  | "gambling"
  | "sold_out"
  | "duplicate"
  | "repeated_format"
  | "previously_rejected";

export interface ActivityReviewItem {
  activity: AdminActivity;
  group: ReviewGroup;
  /** Skip reasons first, then risks, then recommending signals. */
  reasons: ReviewReason[];
  /** For a skipped draft, the rejection its first skip reason implies. */
  suggestedRejection: RejectionReason | null;
  score: number;
  duplicateOfId: string | null;
}

export interface ActivityReview {
  counts: Record<ReviewGroup, number>;
  /** Drafts left out because every date has ended. */
  endedCount: number;
  items: ActivityReviewItem[];
}
