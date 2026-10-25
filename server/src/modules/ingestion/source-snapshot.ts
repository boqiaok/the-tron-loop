import { ActivityCostType } from '../activities/enums/activity-cost-type.enum';
import { isSameVenue, normalizeTitle } from './activity-match';
import { ImportWindow } from './import-window';
import { ImportedActivity } from './source-adapter';

/**
 * What a source said about a listing, reduced to the facts that decide
 * whether people can go: raw payloads change daily as sessions and tickets
 * roll over, so they cannot be compared directly.
 */
export interface SourceSnapshot {
  title: string;
  venue: { name: string; address: string | null } | null;
  costType: ActivityCostType;
  costAmountFrom: number | null;
  cancelled: boolean;
  /** Start times the source listed, as ISO strings. */
  dates: string[];
  /** Sources only list dates up to here, so later dates are unknown. */
  windowEnd: string;
  /**
   * Set when the source stopped listing the activity: the upcoming start
   * times inside its import window at that point.
   */
  unlistedDates?: string[];
}

export enum SourceChangeKind {
  Cancelled = 'cancelled',
  DatesRemoved = 'dates_removed',
  Venue = 'venue',
  Title = 'title',
  Cost = 'cost',
  Unlisted = 'unlisted',
}

export interface SourceChange {
  kind: SourceChangeKind;
  before: string | null;
  after: string | null;
  /** For removed dates or an unlisted activity, the start times affected. */
  dates: string[];
}

export function toSourceSnapshot(
  item: ImportedActivity,
  window: ImportWindow,
): SourceSnapshot {
  return {
    title: item.title,
    venue: item.venue
      ? { name: item.venue.name, address: item.venue.address }
      : null,
    costType: item.costType,
    costAmountFrom: item.costAmountFrom,
    cancelled: item.isCancelled,
    dates: item.dates.map(({ startsAt }) => new Date(startsAt).toISOString()),
    windowEnd: new Date(window.endsAt).toISOString(),
  };
}

/**
 * Changes since an editor accepted the source's listing that affect whether
 * people can go. New dates are not changes: they are added automatically.
 */
export function diffSnapshots(
  accepted: SourceSnapshot,
  current: SourceSnapshot,
  now: Date,
): SourceChange[] {
  if (current.cancelled && !accepted.cancelled) {
    return [change(SourceChangeKind.Cancelled, null, null)];
  }
  if (current.unlistedDates && !accepted.unlistedDates) {
    const upcoming = current.unlistedDates.filter(
      (date) => toTime(date) >= now.getTime(),
    );
    return upcoming.length
      ? [{ ...change(SourceChangeKind.Unlisted, null, null), dates: upcoming }]
      : [];
  }

  const changes: SourceChange[] = [];
  const removed = findRemovedDates(accepted, current, now);
  if (removed.length) {
    changes.push({
      ...change(SourceChangeKind.DatesRemoved, null, null),
      dates: removed,
    });
  }
  if (!isSameVenue(accepted.venue, current.venue)) {
    changes.push(
      change(
        SourceChangeKind.Venue,
        accepted.venue?.name ?? null,
        current.venue?.name ?? null,
      ),
    );
  }
  if (normalizeTitle(accepted.title) !== normalizeTitle(current.title)) {
    changes.push(change(SourceChangeKind.Title, accepted.title, current.title));
  }
  const acceptedCost = describeCost(accepted);
  const currentCost = describeCost(current);
  if (acceptedCost !== currentCost) {
    changes.push(change(SourceChangeKind.Cost, acceptedCost, currentCost));
  }
  return changes;
}

/** The accepted listing, noting the dates the source no longer lists. */
export function toUnlistedSnapshot(
  accepted: SourceSnapshot,
  unlistedDates: string[],
): SourceSnapshot {
  return { ...accepted, unlistedDates };
}

/** The accepted listing once the source lists the activity again. */
export function withoutUnlisted(snapshot: SourceSnapshot): SourceSnapshot {
  const listed = { ...snapshot };
  delete listed.unlistedDates;
  return listed;
}

/** Upcoming start times the source lists that the accepted listing lacks. */
export function findAddedDates(
  accepted: SourceSnapshot,
  current: SourceSnapshot,
  now: Date,
): string[] {
  const known = new Set(accepted.dates.map(toTime));
  return current.dates.filter(
    (date) => toTime(date) >= now.getTime() && !known.has(toTime(date)),
  );
}

/** Accepts new dates into a snapshot, extending how far it is known. */
export function withAddedDates(
  accepted: SourceSnapshot,
  current: SourceSnapshot,
  added: string[],
): SourceSnapshot {
  return {
    ...accepted,
    dates: [...accepted.dates, ...added],
    windowEnd:
      toTime(current.windowEnd) > toTime(accepted.windowEnd)
        ? current.windowEnd
        : accepted.windowEnd,
  };
}

/**
 * Accepted upcoming dates missing from the source, only where both imports
 * covered the date: a date past the older window may simply not be listed.
 */
function findRemovedDates(
  accepted: SourceSnapshot,
  current: SourceSnapshot,
  now: Date,
): string[] {
  const listed = new Set(current.dates.map(toTime));
  const coveredUntil = Math.min(
    toTime(accepted.windowEnd),
    toTime(current.windowEnd),
  );
  return accepted.dates.filter((date) => {
    const time = toTime(date);
    return time >= now.getTime() && time <= coveredUntil && !listed.has(time);
  });
}

function describeCost(snapshot: SourceSnapshot): string {
  if (snapshot.costType === ActivityCostType.Free) return 'Free';
  if (snapshot.costType === ActivityCostType.Unknown) return 'Unknown';
  return snapshot.costAmountFrom === null
    ? 'Paid'
    : `From $${Number(snapshot.costAmountFrom).toFixed(2)}`;
}

function change(
  kind: SourceChangeKind,
  before: string | null,
  after: string | null,
): SourceChange {
  return { kind, before, after, dates: [] };
}

function toTime(value: string): number {
  return new Date(value).getTime();
}
