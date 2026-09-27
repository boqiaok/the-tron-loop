import { TZDateMini } from '@date-fns/tz';
import { BadRequestException } from '@nestjs/common';

const GUIDE_TIME_ZONE = 'Pacific/Auckland';

export interface GuideWeek {
  weekStart: string;
  from: Date;
  to: Date;
}

/** Resolves a Monday date to its week, from local midnight to midnight. */
export function parseGuideWeek(weekStart: string): GuideWeek {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(weekStart);
  if (!match) {
    throw new BadRequestException('Week start must use YYYY-MM-DD');
  }
  const [year, month, day] = match.slice(1).map(Number);
  const from = new TZDateMini(year, month - 1, day, GUIDE_TIME_ZONE);
  if (
    from.getFullYear() !== year ||
    from.getMonth() !== month - 1 ||
    from.getDate() !== day
  ) {
    throw new BadRequestException('Week start is not a valid date');
  }
  if (from.getDay() !== 1) {
    throw new BadRequestException('Week start must be a Monday');
  }
  const to = new TZDateMini(from.getTime(), GUIDE_TIME_ZONE);
  to.setDate(to.getDate() + 7);
  return {
    weekStart,
    from: new Date(from.getTime()),
    to: new Date(to.getTime()),
  };
}
