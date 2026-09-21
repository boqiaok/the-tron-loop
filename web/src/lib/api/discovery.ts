import { API_BASE_URL } from "@/lib/api/config";
import type {
  DiscoveryIntent,
  ItineraryResponse,
  ParseResponse,
  RecommendationResponse,
  DiscoverySearchScope,
} from "@/types/discovery";

async function post<T>(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    cache: "no-store",
    signal,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let message = `The discovery service returned ${response.status}.`;
    try {
      const payload = (await response.json()) as {
        message?: string | string[];
      };
      message = Array.isArray(payload.message)
        ? payload.message.join(" ")
        : (payload.message ?? message);
    } catch {}
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export function parseDiscoveryRequest(text: string): Promise<ParseResponse> {
  return post("/discovery/parse", {
    text,
    referenceTime: new Date().toISOString(),
    timezone: "Pacific/Auckland",
  });
}

export function getRecommendations(
  intent: DiscoveryIntent,
  scope: DiscoverySearchScope = "day",
  signal?: AbortSignal,
): Promise<RecommendationResponse> {
  return post("/discovery/recommendations", { intent, scope }, signal);
}

export function buildItinerary(input: {
  intent: DiscoveryIntent;
  scope?: DiscoverySearchScope;
  targetCount: 2 | 3;
  lockedActivityDateIds: string[];
  excludedActivityDateIds: string[];
}): Promise<ItineraryResponse> {
  return post("/discovery/itineraries", {
    ...input,
    scope: input.scope ?? "day",
  });
}

export async function exportItineraryCalendar(input: {
  intent: DiscoveryIntent;
  scope?: DiscoverySearchScope;
  targetCount: 2 | 3;
  lockedActivityDateIds: string[];
  excludedActivityDateIds: string[];
}): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/discovery/itineraries/calendar`,
    {
      method: "POST",
      headers: { Accept: "text/calendar", "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, scope: input.scope ?? "day" }),
    },
  );
  if (!response.ok) throw new Error("The calendar could not be exported.");
  return response.blob();
}
