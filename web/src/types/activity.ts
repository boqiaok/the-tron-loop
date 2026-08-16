export type ActivityCostType = "free" | "paid" | "unknown";
export type ActivityStatus = "published" | "cancelled";

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
}

export interface PaginatedActivities {
  items: Activity[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ActivityFilterOptions {
  costTypes: ActivityCostType[];
  tags: Array<Pick<ActivityTag, "name" | "slug">>;
  suburbs: string[];
}

export interface ActivityFilters {
  q?: string;
  sort: "asc" | "desc";
  costType?: ActivityCostType;
  tag?: string;
  suburb?: string;
  page: number;
}
