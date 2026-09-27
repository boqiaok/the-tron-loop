import { ActivityCategory } from '../activities/enums/activity-category.enum';
import { ActivityCostType } from '../activities/enums/activity-cost-type.enum';
import { NO_SOURCE_SIGNALS } from '../ingestion/source-signals';
import {
  assessActivity,
  findRepeatedFormats,
  formatKey,
  PickCandidate,
  QualityExclusion,
  QualityInput,
  QualityReason,
  suggestPicks,
} from './activity-quality';

const DAY = 24 * 60 * 60 * 1000;
const start = new Date('2026-10-01T07:00:00.000Z');

function input(overrides: Partial<QualityInput> = {}): QualityInput {
  return {
    title: 'Lunchtime Recital',
    category: ActivityCategory.Community,
    costType: ActivityCostType.Paid,
    tags: [],
    startTimes: [start],
    isRecurring: false,
    signals: NO_SOURCE_SIGNALS,
    ...overrides,
  };
}

function weekly(count: number): Date[] {
  return Array.from(
    { length: count },
    (_, index) => new Date(start.getTime() + index * 7 * DAY),
  );
}

describe('assessActivity', () => {
  it('ranks a one-off staged performance above a weekly pub quiz', () => {
    const recital = assessActivity(input({ tags: ['Classical Music'] }));
    const quiz = assessActivity(
      input({
        title: 'Quiz Night',
        tags: ['Quiz, Karaoke'],
        startTimes: weekly(3),
      }),
    );

    expect(recital.reasons).toEqual([
      QualityReason.OneOff,
      QualityReason.Performance,
    ]);
    expect(quiz.reasons).toContain(QualityReason.WeeklyRegular);
    expect(recital.score).toBeGreaterThan(quiz.score);
  });

  it('treats sessions a week apart as a regular rather than a short run', () => {
    const series = assessActivity(input({ startTimes: weekly(3) }));
    const festivalRun = assessActivity(
      input({
        startTimes: [
          start,
          new Date(start.getTime() + DAY),
          new Date(start.getTime() + 2 * DAY),
        ],
      }),
    );

    expect(series.reasons).toContain(QualityReason.WeeklyRegular);
    expect(festivalRun.reasons).toContain(QualityReason.ShortRun);
  });

  it('rewards a sold-out activity but keeps it out of the picks', () => {
    const soldOut = assessActivity(
      input({ signals: { ...NO_SOURCE_SIGNALS, soldOut: true } }),
    );

    expect(soldOut.reasons).toContain(QualityReason.SoldOut);
    expect(soldOut.exclusion).toBe(QualityExclusion.SoldOut);
  });

  it('excludes services and gambling from the picks', () => {
    expect(
      assessActivity(input({ title: 'Justice of the Peace' })).exclusion,
    ).toBe(QualityExclusion.Service);
    expect(
      assessActivity(
        input({ title: 'Book club', tags: ['Community Services'] }),
      ).exclusion,
    ).toBe(QualityExclusion.Service);
    expect(
      assessActivity(input({ title: 'Cash Games', tags: ['Poker'] })).exclusion,
    ).toBe(QualityExclusion.Gambling);
  });

  it('keeps the score between 0 and 100', () => {
    const everything = assessActivity(
      input({
        category: ActivityCategory.Market,
        costType: ActivityCostType.Free,
        tags: ['Festivals', 'Theatre'],
        signals: {
          organizer: 'x',
          soldOut: true,
          featured: true,
          performerCount: 3,
        },
      }),
    );
    expect(everything.score).toBe(100);
  });
});

describe('findRepeatedFormats', () => {
  it('groups three or more listings that share a title', () => {
    const repeated = findRepeatedFormats([
      'Quiz Night',
      'Quiz nights',
      'QUIZ NIGHT',
      'LEGO Club',
      'LEGO Club',
    ]);

    expect(repeated.get(formatKey('Quiz Night'))).toBe(3);
    expect(repeated.has(formatKey('LEGO Club'))).toBe(false);
  });
});

describe('suggestPicks', () => {
  function candidate(
    id: string,
    score: number,
    overrides: Partial<PickCandidate> = {},
  ): PickCandidate {
    return {
      id,
      score,
      exclusion: null,
      organizer: null,
      ...overrides,
    };
  }

  it('takes the best eligible activities up to the limit', () => {
    expect(
      suggestPicks(
        [
          candidate('low', 40),
          candidate('sold-out', 90, { exclusion: QualityExclusion.SoldOut }),
          candidate('high', 80),
          candidate('mid', 60),
        ],
        2,
      ),
    ).toEqual(['high', 'mid']);
  });

  it('takes one pick per organizer', () => {
    expect(
      suggestPicks(
        [
          candidate('festival-talk', 90, { organizer: 'cow' }),
          candidate('festival-tour', 89, { organizer: 'cow' }),
          candidate('recital', 80, { organizer: 'arts_admin' }),
          candidate('manual', 70),
          candidate('manual-2', 60),
        ],
        7,
      ),
    ).toEqual(['festival-talk', 'recital', 'manual', 'manual-2']);
  });

  it('keeps the given order between equal scores', () => {
    expect(
      suggestPicks([candidate('earlier', 59), candidate('later', 59)], 1),
    ).toEqual(['earlier']);
  });
});
