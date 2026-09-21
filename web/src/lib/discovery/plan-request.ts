import type { DiscoveryIntent } from "@/types/discovery";

export const PLAN_REQUEST_KEY = "tron-discovery-request";
export const PLAN_STATE_KEY = "tron-discovery-state";

export interface SavedPlanState {
  intent: DiscoveryIntent;
  scope?: "day" | "week" | "weekend";
  request?: string;
  locked?: string[];
}

/** Hands a typed request to the Plan page, replacing any earlier plan. */
export function startPlan(text: string): void {
  sessionStorage.removeItem(PLAN_STATE_KEY);
  sessionStorage.setItem(PLAN_REQUEST_KEY, text);
}

/**
 * Starts a plan for the day of one occurrence with that occurrence already
 * in it. The window runs from its start until the evening (or its end).
 */
export function startPlanAround(input: {
  title: string;
  dateId: string;
  localDate: string;
  startTime: string;
  endTime: string | null;
}): void {
  const until =
    input.endTime && input.endTime > "21:00" ? input.endTime : "21:00";
  const state: SavedPlanState = {
    scope: "day",
    request: `A day around ${input.title}`,
    locked: [input.dateId],
    intent: {
      date: input.localDate,
      availableFrom: input.startTime,
      availableTo: until,
      timezone: "Pacific/Auckland",
      required: {},
      preferred: { interests: [] },
      targetActivityCount: 2,
      travelMode: "driving",
    },
  };
  sessionStorage.removeItem(PLAN_REQUEST_KEY);
  sessionStorage.setItem(PLAN_STATE_KEY, JSON.stringify(state));
}
