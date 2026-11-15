import { ActivityCategory } from './enums/activity-category.enum';
import {
  classifyListingTiers,
  getListingWeek,
  ListingTier,
  TierHistory,
  TierListing,
} from './listing-tier';

// Monday 16 November 2026, midnight in Hamilton.
const WEEK_START = new Date('2026-11-15T11:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

function at(daysAfterStart: number, hour = 10): Date {
  return new Date(
    WEEK_START.getTime() + daysAfterStart * DAY + hour * 3600_000,
  );
}

function listing(overrides: Partial<TierListing> = {}): TierListing {
  return {
    id: overrides.id ?? 'a',
    title: 'Courtney Barnett',
    category: ActivityCategory.ArtsMusic,
    venueId: 'theatre',
    startTimes: [at(2, 19)],
    ...overrides,
  };
}

function earlier(weeksBefore: number, title: string): TierHistory {
  return {
    title,
    category: ActivityCategory.Family,
    startsAt: new Date(WEEK_START.getTime() - weeksBefore * 7 * DAY + 3600_000),
  };
}

describe('classifyListingTiers', () => {
  it('keeps a one-off concert with the highlights', () => {
    const tiers = classifyListingTiers([listing()], [], WEEK_START);

    expect(tiers.get('a')).toBe(ListingTier.Highlights);
  });

  it('treats an activity open on four or more days as an exhibition', () => {
    const tiers = classifyListingTiers(
      [listing({ startTimes: [at(0), at(1), at(2), at(3)] })],
      [],
      WEEK_START,
    );

    expect(tiers.get('a')).toBe(ListingTier.Exhibitions);
  });

  it('counts sessions on the same local day once', () => {
    const tiers = classifyListingTiers(
      [listing({ startTimes: [at(0, 9), at(0, 14), at(1), at(2)] })],
      [],
      WEEK_START,
    );

    expect(tiers.get('a')).toBe(ListingTier.Highlights);
  });

  it('groups the same session at several libraries as a weekly session', () => {
    const storytime = {
      title: 'Storytime  Puaawai',
      category: ActivityCategory.Family,
    };
    const tiers = classifyListingTiers(
      [
        listing({ ...storytime, id: 'glenview', venueId: 'glenview' }),
        listing({
          ...storytime,
          id: 'central',
          venueId: 'central',
          title: 'storytime puaawai',
        }),
        listing({ id: 'concert' }),
      ],
      [],
      WEEK_START,
    );

    expect(tiers.get('glenview')).toBe(ListingTier.Regular);
    expect(tiers.get('central')).toBe(ListingTier.Regular);
    expect(tiers.get('concert')).toBe(ListingTier.Highlights);
  });

  it('treats a session listed in two of the last four weeks as weekly', () => {
    const grief = { title: 'Grief Cafe', category: ActivityCategory.Family };
    const tiers = classifyListingTiers(
      [listing({ ...grief })],
      [earlier(1, 'Grief Cafe'), earlier(3, 'Grief Cafe')],
      WEEK_START,
    );

    expect(tiers.get('a')).toBe(ListingTier.Regular);
  });

  it('ignores one earlier listing and listings older than four weeks', () => {
    const grief = { title: 'Grief Cafe', category: ActivityCategory.Family };
    const tiers = classifyListingTiers(
      [listing({ ...grief })],
      [earlier(1, 'Grief Cafe'), earlier(6, 'Grief Cafe')],
      WEEK_START,
    );

    expect(tiers.get('a')).toBe(ListingTier.Highlights);
  });

  it('keeps a weekly market with the highlights', () => {
    const market = {
      title: "Hamilton Farmers' Market",
      category: ActivityCategory.Market,
    };
    const tiers = classifyListingTiers(
      [listing({ ...market })],
      [
        { ...market, startsAt: new Date(WEEK_START.getTime() - 6 * DAY) },
        { ...market, startsAt: new Date(WEEK_START.getTime() - 13 * DAY) },
      ],
      WEEK_START,
    );

    expect(tiers.get('a')).toBe(ListingTier.Highlights);
  });
});

describe('getListingWeek', () => {
  it('returns the local Monday-to-Monday week around an instant', () => {
    const week = getListingWeek(new Date('2026-11-21T02:00:00.000Z'));

    expect(week.from.toISOString()).toBe('2026-11-15T11:00:00.000Z');
    expect(week.to.toISOString()).toBe('2026-11-22T11:00:00.000Z');
  });

  it('keeps a Monday morning in its own week', () => {
    const week = getListingWeek(new Date('2026-11-15T11:00:00.000Z'));

    expect(week.from.toISOString()).toBe('2026-11-15T11:00:00.000Z');
  });
});
