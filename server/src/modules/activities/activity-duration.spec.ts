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
