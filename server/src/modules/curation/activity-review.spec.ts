import { ActivityCategory } from '../activities/enums/activity-category.enum';
import { ActivityCostType } from '../activities/enums/activity-cost-type.enum';
import { RejectionReason } from '../activities/enums/rejection-reason.enum';
import { NO_SOURCE_SIGNALS, SourceSignals } from '../ingestion/source-signals';
import { assessActivity } from './activity-quality';
import {
  classifyForReview,
  DraftIdentity,
  findDuplicates,
  findRepeatedFormatKeys,
  hasEnded,
  ReviewGroup,
  ReviewInput,
  ReviewReason,
} from './activity-review';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-09-27T00:00:00.000Z');
const soon = new Date('2026-10-03T07:00:00.000Z');

interface Listing {
  title: string;
  tags?: string[];
  costType?: ActivityCostType;
  startTimes?: Date[];
  signals?: Partial<SourceSignals>;
}

function review(
  listing: Listing,
  context: Partial<Omit<ReviewInput, 'title' | 'tags' | 'costType'>> = {},
) {
  const tags = listing.tags ?? [];
  const costType = listing.costType ?? ActivityCostType.Paid;
  return classifyForReview({
    title: listing.title,
    tags,
    costType,
    assessment: assessActivity({
      title: listing.title,
      category: ActivityCategory.Community,
      costType,
      tags,
      startTimes: listing.startTimes ?? [soon],
      isRecurring: false,
      signals: { ...NO_SOURCE_SIGNALS, ...listing.signals },
    }),
    trustedSource: false,
    previouslyPublished: false,
    titleRejected: false,
    organizerRejected: false,
    duplicate: false,
    repeatedFormat: false,
    ...context,
  });
}

function weekly(count: number): Date[] {
  return Array.from(
    { length: count },
    (_, index) => new Date(soon.getTime() + index * 7 * DAY),
  );
}

function daily(count: number): Date[] {
  return Array.from(
    { length: count },
    (_, index) => new Date(soon.getTime() + index * DAY),
  );
}

describe('classifyForReview', () => {
  it('recommends a one-off performance', () => {
    expect(
      review({ title: 'Lunchtime Recital', tags: ['Classical Music'] }),
    ).toEqual({
      group: ReviewGroup.Recommended,
      reasons: [ReviewReason.OneOff],
      suggestedRejection: null,
    });
  });

  it('recommends a long museum exhibition because the source is trusted', () => {
    const result = review(
      {
        title: 'Fossil Finds',
        tags: ['Museum', 'Exhibition'],
        costType: ActivityCostType.Free,
        startTimes: daily(21),
      },
      { trustedSource: true },
    );
    expect(result.group).toBe(ReviewGroup.Recommended);
    expect(result.reasons).toEqual([ReviewReason.TrustedSource]);
  });

  it('recommends a weekly regular that has been published before', () => {
    const result = review(
      { title: "Farmers' Market", startTimes: weekly(3) },
      { previouslyPublished: true },
    );
    expect(result).toEqual({
      group: ReviewGroup.Recommended,
      reasons: [ReviewReason.PreviouslyPublished],
      suggestedRejection: null,
    });
  });

  it('asks for a look at an unfamiliar weekly regular', () => {
    expect(
      review({ title: 'Weekly Dance Fitness Class', startTimes: weekly(3) }),
    ).toEqual({
      group: ReviewGroup.Review,
      reasons: [ReviewReason.UnfamiliarRegular],
      suggestedRejection: null,
    });
  });

  it('asks for a look at an unfamiliar long run', () => {
    expect(
      review({ title: 'GLOtron!', startTimes: daily(30) }).reasons,
    ).toEqual([ReviewReason.UnverifiedLongRun]);
  });

  it.each([
    [
      'Speed Dating for ages 35-49',
      ['Socials, Singles, Balls'],
      ReviewReason.Adult,
    ],
    ['Hamilton SA Party 2026', ['Bar DJs'], ReviewReason.Adult],
    ['Floating Meditation with Sound Bowls', [], ReviewReason.Wellness],
    ['Seasonal Group Sessions', ['Mind & Body'], ReviewReason.Wellness],
    [
      'Leadership and Management',
      ['Business & Professional'],
      ReviewReason.Business,
    ],
  ])(
    'asks for a look at "%s" even as a single listing',
    (title, tags, risk) => {
      const result = review({ title, tags });
      expect(result.group).toBe(ReviewGroup.Review);
      expect(result.reasons[0]).toBe(risk);
    },
  );

  it('keeps risks ahead of a trusted source', () => {
    expect(
      review(
        { title: 'Community Lunch', costType: ActivityCostType.Unknown },
        { trustedSource: true },
      ).group,
    ).toBe(ReviewGroup.Review);
  });

  it('skips a service even when a similar listing was published', () => {
    const result = review(
      { title: 'Justice of the Peace', tags: ['Community Services'] },
      { trustedSource: true, previouslyPublished: true },
    );
    expect(result.group).toBe(ReviewGroup.Skip);
    expect(result.reasons[0]).toBe(ReviewReason.Service);
  });

  it.each([
    [
      { title: 'Cash Poker Night', tags: ['Poker'] },
      {},
      ReviewReason.Gambling,
      RejectionReason.NotSuitable,
    ],
    [
      { title: 'Rhapsody', signals: { soldOut: true } },
      {},
      ReviewReason.SoldOut,
      RejectionReason.NotAvailable,
    ],
    [
      { title: 'Open Mic' },
      { duplicate: true },
      ReviewReason.Duplicate,
      RejectionReason.Duplicate,
    ],
    [
      { title: 'Quiz Night' },
      { repeatedFormat: true },
      ReviewReason.RepeatedFormat,
      RejectionReason.NotSuitable,
    ],
    [
      { title: 'Energy Circle' },
      { titleRejected: true, previouslyPublished: true },
      ReviewReason.PreviouslyRejected,
      RejectionReason.NotSuitable,
    ],
  ])(
    'skips %o and suggests the matching rejection',
    (listing: Listing, context, reason, rejection) => {
      const result = review(listing, context);
      expect(result.group).toBe(ReviewGroup.Skip);
      expect(result.reasons[0]).toBe(reason);
      expect(result.suggestedRejection).toBe(rejection);
    },
  );

  it('asks for a look when the organizer had an activity rejected', () => {
    const result = review(
      { title: 'Spring Recital' },
      { organizerRejected: true, previouslyPublished: true },
    );
    expect(result.group).toBe(ReviewGroup.Review);
    expect(result.reasons).toEqual([
      ReviewReason.OrganizerRejected,
      ReviewReason.PreviouslyPublished,
      ReviewReason.OneOff,
    ]);
  });

  it('asks for a look when nothing recommends the activity', () => {
    expect(
      review({ title: 'Model Railway Show', startTimes: daily(8) }),
    ).toEqual({
      group: ReviewGroup.Review,
      reasons: [ReviewReason.NoSignal],
      suggestedRejection: null,
    });
  });
});

describe('hasEnded', () => {
  const past = new Date('2026-09-01T07:00:00.000Z');

  it('is false for an undated activity', () => {
    expect(hasEnded([], now)).toBe(false);
  });

  it('is true only when every date has finished', () => {
    const ended = { startsAt: past, endsAt: null, recurrenceRule: null };
    expect(hasEnded([ended], now)).toBe(true);
    expect(
      hasEnded(
        [ended, { startsAt: soon, endsAt: null, recurrenceRule: null }],
        now,
      ),
    ).toBe(false);
  });

  it('keeps a recurring date current until its UNTIL day', () => {
    const date = (recurrenceRule: string) => ({
      startsAt: past,
      endsAt: null,
      recurrenceRule,
    });
    expect(hasEnded([date('FREQ=WEEKLY;UNTIL=20261231T000000Z')], now)).toBe(
      false,
    );
    expect(hasEnded([date('FREQ=WEEKLY;UNTIL=20260920T000000Z')], now)).toBe(
      true,
    );
    expect(hasEnded([date('FREQ=WEEKLY;COUNT=4')], now)).toBe(false);
  });
});

describe('findDuplicates', () => {
  const draft = (overrides: Partial<DraftIdentity>): DraftIdentity => ({
    id: 'draft',
    title: 'Opus Orchestra',
    venueId: 'library',
    startTimes: [soon],
    soldOut: false,
    createdAt: now,
    ...overrides,
  });

  it('marks a draft that repeats a published activity', () => {
    const duplicates = findDuplicates(
      [draft({ id: 'new' })],
      [
        {
          id: 'live',
          title: 'Opus orchestra!',
          venueId: 'library',
          startTimes: [],
        },
      ],
    );
    expect([...duplicates]).toEqual([['new', 'live']]);
  });

  it('keeps the bookable draft and marks the sold-out copy', () => {
    const duplicates = findDuplicates(
      [
        draft({ id: 'sold-out', soldOut: true, venueId: null }),
        draft({ id: 'bookable', venueId: null }),
      ],
      [],
    );
    expect([...duplicates]).toEqual([['sold-out', 'bookable']]);
  });

  it('keeps listings at other venues and times', () => {
    expect(
      findDuplicates(
        [
          draft({ id: 'a' }),
          draft({ id: 'b', venueId: 'hall', startTimes: [new Date(0)] }),
        ],
        [],
      ).size,
    ).toBe(0);
  });
});

describe('findRepeatedFormatKeys', () => {
  it('finds a title held at three or more venues', () => {
    const quiz = (id: string, venueId: string) => ({
      id,
      title: id.startsWith('q') ? 'Quiz Night' : 'Quiz Nights',
      venueId,
      startTimes: [],
    });
    expect([
      ...findRepeatedFormatKeys([
        quiz('q1', 'bar'),
        quiz('q2', 'pub'),
        quiz('x3', 'club'),
        { id: 'r', title: 'Recital', venueId: 'bar', startTimes: [] },
      ]),
    ]).toEqual(['quiz night']);
  });
});
