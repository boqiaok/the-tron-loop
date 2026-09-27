import type { Activity } from "@/types/activity";

export type WeeklyGuideStatus = "draft" | "published";

export interface WeeklyGuideItem {
  activity: Activity;
  note: string | null;
}

export interface WeeklyGuide {
  weekStart: string;
  status: WeeklyGuideStatus;
  intro: string | null;
  publishedAt: string | null;
  items: WeeklyGuideItem[];
}

export type QualityReason =
  | "one_off"
  | "short_run"
  | "long_run"
  | "sold_out"
  | "featured"
  | "festival"
  | "performance"
  | "performers"
  | "market"
  | "weekly_regular"
  | "meetup"
  | "free";

export type QualityExclusion =
  | "service"
  | "gambling"
  | "sold_out"
  | "repeated_format";

export interface GuideCandidate {
  activity: Activity;
  score: number;
  reasons: QualityReason[];
  exclusion: QualityExclusion | null;
  repeatedFormatCount: number | null;
  organizer: string | null;
  suggested: boolean;
}

export interface AdminWeeklyGuide {
  weekStart: string;
  guide: WeeklyGuide | null;
  candidates: GuideCandidate[];
}

export interface WeeklyGuideInput {
  intro: string | null;
  items: Array<{ activityId: string; note: string | null }>;
}
