export type ActivityCategory =
  | "market"
  | "workshop"
  | "family"
  | "outdoors"
  | "arts_music"
  | "community";
export type ActivityCostType = "free" | "paid" | "unknown";
export type ActivityStatus = "draft" | "published" | "cancelled";
export type ActivityEnvironment = "indoor" | "outdoor" | "mixed" | "unknown";
export type ActivityScheduleMode = "fixed" | "window";
export type DurationSource =
  "source" | "parsed" | "category_default" | "manual";

export interface Venue {
  id: string;
  name: string;
  address: string | null;
  suburb: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
}

export interface ActivityTag {
  id: string;
  name: string;
  slug: string;
}

export interface ActivityDate {
  id: string;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  isAllDay: boolean;
  recurrenceRule: string | null;
}

export interface Activity {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  description: string;
  imageUrl: string | null;
  category: ActivityCategory;
  environment: ActivityEnvironment;
  scheduleMode: ActivityScheduleMode;
  visitMinutes: number | null;
  durationSource: DurationSource;
  costType: ActivityCostType;
  costAmountFrom: number | null;
  currency: string;
  costDetails: string | null;
  venue: Venue | null;
  sourceUrl: string | null;
  status: ActivityStatus;
  publishedAt: string | null;
  cancelledAt: string | null;
  dates: ActivityDate[];
  tags: ActivityTag[];
  createdAt: string;
  updatedAt: string;
  distanceKm?: number | null;
}

export interface PaginatedActivities {
  items: Activity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ActivityFilterOptions {
  categories: Array<{ category: ActivityCategory; count: number }>;
  suburbs: string[];
  cancelledCount: number;
}

export type WhenFilter = "today" | "weekend" | "evening";

export interface ActivityFilters {
  q?: string;
  sortBy: "date" | "distance";
  latitude?: number;
  longitude?: number;
  includeCancelled: boolean;
  costType?: Exclude<ActivityCostType, "unknown">;
  categories: ActivityCategory[];
  when?: WhenFilter;
  suburb?: string;
  page: number;
}
