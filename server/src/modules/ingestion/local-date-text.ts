import { TZDateMini } from '@date-fns/tz';
import { BadRequestException } from '@nestjs/common';
import { isValid, parse } from 'date-fns';
import { IMPORT_TIMEZONE } from './import-window';
import { ImportedActivityDate } from './source-adapter';

const DAY_FORMATS = ['d MMMM yyyy', 'd MMM yyyy'];
const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];
// Dates this far in the past belong to next year; sites omit the year.
const PAST_TOLERANCE_DAYS = 60;

/**
 * Parses website date text such as "Thursday 15 October" with
 * "3:30 PM to 4:30 PM" (or "All day") into a Pacific/Auckland session.
 */
export function parseLocalDateText(
  dayText: string,
  timeText: string | null,
  now = Date.now(),
): ImportedActivityDate {
  const day = parseDay(clean(dayText), now);
  const time = timeText === null ? '' : clean(timeText).toLowerCase();

  if (time === '' || time === 'all day') {
    return {
      startsAt: toIso(day, { hours: 0, minutes: 0 }),
      endsAt: null,
      timezone: IMPORT_TIMEZONE,
      isAllDay: true,
    };
  }

  const [startText, endText, ...rest] = time.split(/\s*(?:\bto\b|-|–|—)\s*/);
  if (!startText || rest.length) throw invalid(`time "${timeText}"`);
  const end = endText ? parseClock(endText) : null;
  const start = parseClock(startText, end);
  const startsAt = toIso(day, start);
  let endsAt = end ? toIso(day, end) : null;
  if (end && endsAt && endsAt <= startsAt) {
    endsAt = toIso({ ...day, date: day.date + 1 }, end);
  }

  return { startsAt, endsAt, timezone: IMPORT_TIMEZONE, isAllDay: false };
}

interface LocalDay {
  year: number;
  month: number;
  date: number;
}

function parseDay(text: string, now: number): LocalDay {
  const match = /^(?:([a-z]+),?\s+)?(\d{1,2}\s+[a-z]+)(?:\s+(\d{4}))?$/i.exec(
    text,
  );
  if (!match) throw invalid(`date "${text}"`);
  const [, weekday, dayMonth, explicitYear] = match;

  const today = new TZDateMini(now, IMPORT_TIMEZONE);
  let year = explicitYear ? Number(explicitYear) : today.getFullYear();
  let day = parseDayMonth(dayMonth, year, text);
  if (!explicitYear) {
    const candidate = new TZDateMini(
      day.year,
      day.month,
      day.date,
      IMPORT_TIMEZONE,
    );
    const ageDays = (today.getTime() - candidate.getTime()) / 86_400_000;
    if (ageDays > PAST_TOLERANCE_DAYS) {
      year += 1;
      day = parseDayMonth(dayMonth, year, text);
    }
  }

  if (weekday) {
    const expected = WEEKDAYS.findIndex((name) =>
      name.startsWith(weekday.toLowerCase()),
    );
    const actual = new TZDateMini(
      day.year,
      day.month,
      day.date,
      IMPORT_TIMEZONE,
    ).getDay();
    if (weekday.length < 3 || expected !== actual) {
      throw invalid(`date "${text}" (weekday does not match ${day.year})`);
    }
  }
  return day;
}

function parseDayMonth(dayMonth: string, year: number, text: string) {
  for (const format of DAY_FORMATS) {
    const parsed = parse(`${dayMonth} ${year}`, format, new Date(0));
    if (isValid(parsed)) {
      return {
        year: parsed.getFullYear(),
        month: parsed.getMonth(),
        date: parsed.getDate(),
      };
    }
  }
  throw invalid(`date "${text}"`);
}

interface Clock {
  hours: number;
  minutes: number;
  meridiem?: 'am' | 'pm';
}

/**
 * A start time without am/pm ("10 to 11:30am", "11 to 1pm") takes the end
 * time's meridiem, or the opposite one when that would start after the end.
 */
function parseClock(text: string, end?: Clock | null): Clock {
  const match = /^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/.exec(text);
  if (!match) throw invalid(`time "${text}"`);
  const hour = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  const meridiem = match[3] as Clock['meridiem'];
  if (minutes > 59) throw invalid(`time "${text}"`);

  const toHours = (value: 'am' | 'pm') =>
    (hour % 12) + (value === 'pm' ? 12 : 0);
  if (meridiem) {
    if (hour < 1 || hour > 12) throw invalid(`time "${text}"`);
    return { hours: toHours(meridiem), minutes, meridiem };
  }
  if (!end?.meridiem) {
    if (hour > 23) throw invalid(`time "${text}"`);
    return { hours: hour, minutes };
  }

  if (hour < 1 || hour > 12) throw invalid(`time "${text}"`);
  const hours = toHours(end.meridiem);
  if (hours * 60 + minutes < end.hours * 60 + end.minutes) {
    return { hours, minutes };
  }
  return { hours: toHours(end.meridiem === 'pm' ? 'am' : 'pm'), minutes };
}

function toIso(day: LocalDay, clock: Clock): string {
  return new TZDateMini(
    day.year,
    day.month,
    day.date,
    clock.hours,
    clock.minutes,
    0,
    IMPORT_TIMEZONE,
  ).toISOString();
}

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function invalid(detail: string): BadRequestException {
  return new BadRequestException(`Unrecognised ${detail}`);
}
