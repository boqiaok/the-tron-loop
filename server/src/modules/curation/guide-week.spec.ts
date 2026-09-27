import { BadRequestException } from '@nestjs/common';
import { parseGuideWeek } from './guide-week';

describe('parseGuideWeek', () => {
  it('spans Monday to Monday at Auckland midnight', () => {
    const week = parseGuideWeek('2026-09-28');
    expect(week.from.toISOString()).toBe('2026-09-27T11:00:00.000Z');
    expect(week.to.toISOString()).toBe('2026-10-04T11:00:00.000Z');
  });

  it('keeps seven local days across the daylight saving change', () => {
    // New Zealand daylight time starts on Sunday 27 September 2026.
    const week = parseGuideWeek('2026-09-21');
    expect(week.from.toISOString()).toBe('2026-09-20T12:00:00.000Z');
    expect(week.to.toISOString()).toBe('2026-09-27T11:00:00.000Z');
  });

  it.each(['2026-09-29', '2026-02-30', '28-09-2026'])('rejects %s', (value) => {
    expect(() => parseGuideWeek(value)).toThrow(BadRequestException);
  });
});
