import type {
  Activity,
  ActivityDate,
  ActivityEnvironment,
} from "@/types/activity";

export type TravelMode = "driving" | "walking";
export type DiscoverySearchScope = "day" | "week" | "weekend";

export interface DiscoveryIntent {
  date: string;
  availableFrom: string;
  availableTo: string;
  timezone: "Pacific/Auckland";
  required: {
    familyFriendly?: boolean;
    environment?: ActivityEnvironment;
    freeOnly?: boolean;
  };
  preferred: {
    free?: boolean;
    interests: string[];
    suburb?: string;
  };
  targetActivityCount: 2 | 3;
  travelMode: TravelMode;
}

export interface Recommendation {
  activity: Activity;
  date: Omit<ActivityDate, "recurrenceRule"> & {
    sourceStartsAt?: string;
    sourceEndsAt?: string | null;
    timing?: "fixed" | "flexible";
    durationEstimated?: boolean;
  };
  score: number;
  reasons: Array<{ code: string; value?: string }>;
  unmetPreferences: Array<{ code: string; value?: string }>;
  matchedInterests: string[];
}

export interface RecommendationResponse {
  items: Recommendation[];
  relaxationSuggestions: Array<{
    code: string;
    label: string;
    count: number;
    intent: DiscoveryIntent;
  }>;
}

export interface ParseResponse {
  intent: DiscoveryIntent | null;
  // Legacy API value for successful AI parsing; the provider is now Gemini.
  source: "openai" | "manual";
  unresolved: string[];
  manualEntryRequired: boolean;
}

export interface TravelSegment {
  fromActivityDateId: string;
  toActivityDateId: string;
  estimatedMinutes: number;
  arrivalBufferMinutes: number;
  freeMinutes: number;
  mode: TravelMode;
}

export interface ItineraryResponse {
  status: "complete" | "partial" | "conflict";
  message: string;
  activities?: Recommendation[];
  travelSegments?: TravelSegment[];
  knownEntryCost?: number;
  hasUnknownCosts?: boolean;
  totalTravelMinutes?: number;
  coveredInterests?: string[];
  conflictingActivityDateIds?: string[];
}
