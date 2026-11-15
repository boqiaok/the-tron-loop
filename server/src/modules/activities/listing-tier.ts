import { TZDateMini } from '@date-fns/tz';
import { ActivityCategory } from './enums/activity-category.enum';

/**
 * Splits a week's listings into the three ways people browse them: one-off
 * highlights, sessions that come back every week, and exhibitions that are
 * open most days. The split depends on the other listings around an activity,
 * so it is worked out per week rather than stored.
 */

export enum ListingTier {
  Highlights = 'highlights',
  Regular = 'regular',
  Exhibitions = 'exhibitions',
}

export const LISTING_TIME_ZONE = 'Pacific/Auckland';
/** Open on this many days of the week: an exhibition, not an event. */
export const EXHIBITION_MIN_DAYS = 4;
/** How far back to look for the same session in earlier weeks. */
export const HISTORY_WEEKS = 4;
/** Listed in at least this many of the earlier weeks: it comes back weekly. */
const REPEAT_MIN_WEEKS = 2;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface TierListing {
  id: string;
  title: string;
  category: ActivityCategory;
  venueId: string | null;
  /** Session starts inside the week being classified. */
  startTimes: Date[];
}

export interface TierHistory {
  title: string;
  category: ActivityCategory;
  startsAt: Date;
}

/** The Monday-to-Monday local week that contains the given instant. */
export function getListingWeek(instant: Date): { from: Date; to: Date } {
  const start = new TZDateMini(instant.getTime(), LISTING_TIME_ZONE);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new TZDateMini(start.getTime(), LISTING_TIME_ZONE);
  end.setDate(end.getDate() + 7);
  return { from: new Date(start.getTime()), to: new Date(end.getTime()) };
}

/**
 * The listings that are one session of something larger share a title and
 * category, like the web listing's series.
 */
export function listingKey(
  listing: Pick<TierListing, 'title' | 'category'>,
): string {
  const title = listing.title.trim().replace(/\s+/g, ' ').toLowerCase();
  return `${listing.category}:${title}`;
}

export function classifyListingTiers(
  listings: TierListing[],
  history: TierHistory[],
  weekStart: Date,
): Map<string, ListingTier> {
  const venuesByKey = new Map<string, Set<string>>();
  for (const listing of listings) {
    const key = listingKey(listing);
    const venues = venuesByKey.get(key) ?? new Set<string>();
    venues.add(listing.venueId ?? listing.id);
    venuesByKey.set(key, venues);
  }

  const weeksByKey = new Map<string, Set<number>>();
  for (const entry of history) {
    const weeksBefore = Math.ceil(
      (weekStart.getTime() - entry.startsAt.getTime()) / WEEK_MS,
    );
    if (weeksBefore < 1 || weeksBefore > HISTORY_WEEKS) continue;
    const key = listingKey(entry);
    const weeks = weeksByKey.get(key) ?? new Set<number>();
    weeks.add(weeksBefore);
    weeksByKey.set(key, weeks);
  }

  return new Map(
    listings.map((listing) => {
      const key = listingKey(listing);
      return [
        listing.id,
        classify(
          listing,
          venuesByKey.get(key)?.size ?? 1,
          weeksByKey.get(key)?.size ?? 0,
        ),
      ];
    }),
  );
}

function classify(
  listing: TierListing,
  venues: number,
  earlierWeeks: number,
): ListingTier {
  if (countLocalDays(listing.startTimes) >= EXHIBITION_MIN_DAYS) {
    return ListingTier.Exhibitions;
  }
  // A weekly market is still a day out, so it stays with the highlights.
  if (listing.category === ActivityCategory.Market) {
    return ListingTier.Highlights;
  }
  if (venues > 1 || earlierWeeks >= REPEAT_MIN_WEEKS) {
    return ListingTier.Regular;
  }
  return ListingTier.Highlights;
}

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: LISTING_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function countLocalDays(startTimes: Date[]): number {
  return new Set(startTimes.map((time) => dayFormatter.format(time))).size;
}
