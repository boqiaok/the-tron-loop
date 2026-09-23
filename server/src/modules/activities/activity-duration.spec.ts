import {
  inferActivityScheduling,
  parseVisitMinutes,
} from './activity-duration';

describe('activity duration inference', () => {
  it('extracts explicit durations once during ingestion', () => {
    expect(parseVisitMinutes('Allow approximately 90 minutes')).toBe(90);
    expect(parseVisitMinutes('A 2-hour exhibition visit')).toBe(120);
  });

  it('uses a category estimate for an open market', () => {
    expect(
      inferActivityScheduling({
        title: 'Saturday makers market',
        description: 'Drop in throughout the day',
        tags: ['community'],
      }),
    ).toEqual({
      scheduleMode: 'window',
      visitMinutes: 90,
      durationSource: 'category_default',
    });
  });

  it('keeps a keyword match fixed when no session is longer than the visit', () => {
    const talk = {
      title: 'From Seed To Sprout',
      description: 'Our monthly talk on growing a pollinator garden',
      tags: ['community'],
    };
    expect(
      inferActivityScheduling({
        ...talk,
        dates: [
          {
            startsAt: '2026-09-23T22:30:00.000Z',
            endsAt: '2026-09-23T23:30:00.000Z',
          },
        ],
      }).scheduleMode,
    ).toBe('fixed');
    expect(
      inferActivityScheduling({
        ...talk,
        dates: [
          {
            startsAt: '2026-09-23T21:00:00.000Z',
            endsAt: '2026-09-24T04:00:00.000Z',
          },
        ],
      }),
    ).toMatchObject({ scheduleMode: 'window', visitMinutes: 90 });
  });

  it('keeps ordinary sessions fixed', () => {
    expect(
      inferActivityScheduling({
        title: 'Photography lecture',
        description: 'A lecture with a fixed start time',
        tags: ['arts'],
      }).scheduleMode,
    ).toBe('fixed');
  });
});
