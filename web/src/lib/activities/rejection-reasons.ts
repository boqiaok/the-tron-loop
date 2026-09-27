import type { RejectionReason } from "@/types/activity";

export const REJECTION_REASON_OPTIONS: Array<{
  value: RejectionReason;
  label: string;
  description: string;
}> = [
  {
    value: "not_suitable",
    label: "Not suitable",
    description:
      "Not right for families and the community. Drafts with the same title are skipped, and the organiser's next listings are flagged.",
  },
  {
    value: "duplicate",
    label: "Duplicate",
    description: "Another listing already covers it.",
  },
  {
    value: "not_available",
    label: "Not available",
    description: "Nobody can go, such as a sold-out event or a service.",
  },
];

export const REJECTION_REASON_LABELS = Object.fromEntries(
  REJECTION_REASON_OPTIONS.map(({ value, label }) => [value, label]),
) as Record<RejectionReason, string>;
