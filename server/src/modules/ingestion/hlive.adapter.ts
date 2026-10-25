import { TZDateMini } from '@date-fns/tz';
import { BadRequestException, Injectable } from '@nestjs/common';
import { load } from 'cheerio';
import { ActivityCostType } from '../activities/enums/activity-cost-type.enum';
import { Source } from './entities/source.entity';
import {
  getImportWindow,
  IMPORT_TIMEZONE,
  ImportWindow,
  isWithinImportWindow,
} from './import-window';
import { inferCategory } from './infer-category';
import { findTimeText, parseLocalDateText } from './local-date-text';
import {
  ImportedActivity,
  ImportedActivityDate,
  SourceAdapter,
  SourceCategory,
} from './source-adapter';
import {
  delay,
  fetchText,
  isRecord,
  parseHttpUrl,
  readOptionalString,
} from './source-http';

const LABEL = 'HLive';
const REQUEST_INTERVAL_MS = 1_000;
const MAX_EVENTS = 80;
const MAX_RANGE_DAYS = 366;
const FREE_GENRE = 'free';
const MONTHS: Record<string, string> = {
  jan: 'January',
  feb: 'February',
  mar: 'March',
  apr: 'April',
  may: 'May',
  jun: 'June',
  jul: 'July',
  aug: 'August',
  sep: 'September',
  oct: 'October',
  nov: 'November',
  dec: 'December',
};
const MONTH_NAMES = Object.values(MONTHS);
/**
 * HLive's regular venues, keyed by the venue card title. Coordinates match
 * the venues Eventfinda already lists there.
 */
const VENUE_COORDINATES: Record<
  string,
  { latitude: number; longitude: number }
> = {
  claudelands: { latitude: -37.7791, longitude: 175.2891 },
  'hamilton gardens': { latitude: -37.8057, longitude: 175.3049 },
  'fmg stadium waikato': { latitude: -37.7811, longitude: 175.2679 },
  'bnz theatre': { latitude: -37.7888, longitude: 175.2847 },
  'clarence st theatre': { latitude: -37.7947, longitude: 175.2829 },
  'the meteor': { latitude: -37.7859, longitude: 175.2817 },
  'mystery creek': { latitude: -37.873, longitude: 175.3484 },
};

export interface HliveSession {
  /** "06 NOV 26" or "06 NOV 26 - 08 NOV 26". */
  days: string;
  /** "4pm - 8pm"; empty when the times are to be announced. */
  times: string[];
}

export interface HlivePage {
  title: string;
  description: string;
  imageUrl: string | null;
  /** The banner badge, such as "on-sale-now", "just-announced" or "sold-out". */
  status: string | null;
  /** The spot within the venue, such as "Claudelands Arena". */
  place: string | null;
  venueName: string | null;
  venueAddress: string | null;
  sessions: HliveSession[];
}

/**
 * Imports HLive, the city council's guide to Hamilton's major events. The
 * site has no API or feed, so the adapter reads the event listing, the
 * listing filtered by each event type (the only place types appear), and
 * then each event page.
 */
@Injectable()
export class HliveAdapter implements SourceAdapter {
  async fetch(source: Source): Promise<Record<string, unknown>[]> {
    const listingHtml = await fetchText(source.feedUrl, {
      label: LABEL,
      accept: 'text/html',
    });
    const urls = parseListing(listingHtml, source.feedUrl).slice(0, MAX_EVENTS);

    const genres = new Map<string, string[]>();
    for (const genre of parseGenres(listingHtml)) {
      await delay(REQUEST_INTERVAL_MS);
      const searchUrl = new URL('/search/events', source.feedUrl);
      searchUrl.searchParams.set('genre', genre.id);
      const html = await fetchText(searchUrl.toString(), {
        label: LABEL,
        accept: 'text/html',
      });
      for (const url of parseListing(html, source.feedUrl)) {
        genres.set(url, [...(genres.get(url) ?? []), genre.name]);
      }
    }

    const window = getImportWindow();
    const records: Record<string, unknown>[] = [];
    for (const url of urls) {
      await delay(REQUEST_INTERVAL_MS);
      const page = parseHlivePage(
        await fetchText(url, { label: LABEL, accept: 'text/html' }),
        url,
      );
      const record = toHliveRecord(page, url, genres.get(url) ?? []);
      if (hasSessionInWindow(page.sessions, window)) records.push(record);
    }
    return records;
  }

  parse(raw: Record<string, unknown>): ImportedActivity {
    return mapHliveActivity(raw);
  }

  categorize(raw: Record<string, unknown>): SourceCategory {
    return categorizeHliveActivity(raw);
  }
}

/** Event page links from a listing or search page's event tiles. */
export function parseListing(html: string, pageUrl: string): string[] {
  const $ = load(html);
  const origin = new URL(pageUrl).origin;
  const urls = new Set<string>();
  $('.event-tile a[href]').each((_, element) => {
    const href = $(element).attr('href');
    const url = href ? parseHttpUrl(href, origin) : null;
    if (!url) return;
    const parsed = new URL(url);
    if (
      parsed.origin === origin &&
      /^\/events\/[a-z0-9-]+$/.test(parsed.pathname)
    ) {
      urls.add(`${parsed.origin}${parsed.pathname}`);
    }
  });
  return [...urls];
}

/** The event types offered by the listing's event finder. */
export function parseGenres(html: string): Array<{ id: string; name: string }> {
  const $ = load(html);
  return $('select[name="genre"] option')
    .toArray()
    .map((element) => ({
      id: $(element).attr('value') ?? '',
      name: clean($(element).text()),
    }))
    .filter(({ id, name }) => /^\d+$/.test(id) && name);
}

export function parseHlivePage(html: string, url: string): HlivePage {
  const $ = load(html);
  const main = $('main').first();
  const title = clean(main.find('.banner-title').first().text());
  if (!title) throw new BadRequestException(`${LABEL} page has no title`);

  const paragraphs = main
    .find('.event-content')
    .first()
    .find('p, li, div')
    .filter((_, element) => $(element).children('p, li, div, ul').length === 0)
    .toArray()
    .map((element) => clean($(element).text()))
    .filter(Boolean);

  const image = main
    .find('.banner-image img')
    .not('.banner-status')
    .attr('src');
  const location = clean(main.find('.banner-location').first().text());
  // The last card describes the venue: its title and street address.
  const venueCard = main
    .find('.event-card')
    .filter((_, element) => $(element).find('.event-card-location').length > 0)
    .first();
  const venueName = clean(venueCard.find('.event-card-title').text()) || null;
  const address = (venueCard.find('.event-card-location').html() ?? '')
    .split(/<br\s*\/?>/i)
    .map((line) => clean(load(line).text()))
    .filter((line) => line && !/^new zealand$/i.test(line));

  const sessions = main
    .find('.event-card-times-section')
    .toArray()
    .map((element) => ({
      days: clean($(element).find('.event-card-times-date').text()),
      times: $(element)
        .find('.event-time-list li')
        .toArray()
        .map((item) => clean($(item).text()))
        .filter(Boolean),
    }))
    .filter((session) => session.days);

  return {
    title: title.replace(/\s*\|\s*hamilton$/i, ''),
    description: [...new Set(paragraphs)].join('\n\n') || title,
    imageUrl: image ? parseHttpUrl(image, url) : null,
    status: main.find('.banner-status').attr('alt')?.trim() || null,
    place: readPlace(location, venueName),
    venueName,
    venueAddress: [...new Set(address)].join(', ') || null,
    sessions,
  };
}

export function toHliveRecord(
  page: HlivePage,
  url: string,
  genres: string[],
): Record<string, unknown> {
  const slug = new URL(url).pathname.split('/').filter(Boolean).pop();
  return { externalId: slug, url, genres, ...page };
}

export function categorizeHliveActivity(
  raw: Record<string, unknown>,
): SourceCategory {
  const labels = readGenres(raw).filter(
    (genre) => genre.toLowerCase() !== FREE_GENRE,
  );
  const description = requireString(raw, 'description');
  return {
    category: inferCategory({
      title: requireString(raw, 'title', 200),
      labels,
      text: description.split('\n\n')[0],
    }),
    labels,
  };
}

export function mapHliveActivity(
  raw: Record<string, unknown>,
  now = Date.now(),
): ImportedActivity {
  const title = requireString(raw, 'title', 200);
  const body = requireString(raw, 'description');
  const place = readOptionalString(raw, 'place', 200);
  const venueName = readOptionalString(raw, 'venueName', 200);
  // The venue is the site HLive groups events by; the spot goes in the text.
  const description = place ? `${body}\n\nWhere: ${place}.` : body;
  const isFree = readGenres(raw).some(
    (genre) => genre.toLowerCase() === FREE_GENRE,
  );
  const status = readOptionalString(raw, 'status', 100) ?? '';
  const { category, labels } = categorizeHliveActivity(raw);

  return {
    externalId: requireString(raw, 'externalId', 255),
    title,
    summary: body.split('\n\n')[0].slice(0, 500),
    description,
    imageUrl: readUrl(raw, 'imageUrl'),
    category,
    sourceUrl: readUrl(raw, 'url'),
    dates: parseHliveSessions(
      readSessions(raw.sessions),
      getImportWindow(now),
      now,
    ),
    venue: venueName
      ? {
          name: venueName,
          address: readOptionalString(raw, 'venueAddress', 255),
          suburb: null,
          ...(VENUE_COORDINATES[venueName.toLowerCase()] ?? {}),
        }
      : null,
    tags: labels,
    costType: isFree ? ActivityCostType.Free : ActivityCostType.Unknown,
    costAmountFrom: isFree ? 0 : null,
    costDetails: isFree ? 'Free' : null,
    isCancelled: /cancel|postpone/i.test(status),
    raw,
  };
}

// HLive abbreviates months to three letters, except "SEPT".
const DAY = /^(\d{1,2})\s+([a-z]{3,4})\s+(\d{2})$/i;

/**
 * Turns event time cards into sessions inside the import window. A range of
 * days repeats its times on each day. Time lines are free text, so each
 * gives its first time ("9am - 5pm" from "Fri & Sat 9am - 5pm | Sun 9am -
 * 4pm"); a card without a time ("To be announced", "6 & 7 November") becomes
 * an all-day session.
 */
export function parseHliveSessions(
  sessions: HliveSession[],
  window: ImportWindow,
  now = Date.now(),
): ImportedActivityDate[] {
  const dates = sessions.flatMap((session) => {
    const [first, last, ...rest] = session.days.split(/\s+-\s+/);
    if (rest.length) throw invalid(session.days);
    const days = dayTexts(first, last ?? first, now);
    const found = session.times
      .map(findTimeText)
      .filter((time) => time !== null);
    const times = found.length ? found : [null];
    return days.flatMap((day) =>
      times.map((time) => parseLocalDateText(day, time, now)),
    );
  });
  const inWindow = dates.filter((date) =>
    isWithinImportWindow(date.startsAt, window),
  );
  return [
    ...new Map(inWindow.map((date) => [date.startsAt, date])).values(),
  ].sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

/** Each day from the first to the last, as "6 November 2026". */
function dayTexts(first: string, last: string, now: number): string[] {
  const start = localDay(first, now);
  const end = localDay(last, now);
  if (end < start) throw invalid(`${first} - ${last}`);

  const days: string[] = [];
  for (
    let day = start;
    day <= end && days.length < MAX_RANGE_DAYS;
    // TZDateMini normalises overflow, e.g. 32 October becomes 1 November.
    day = new TZDateMini(
      day.getFullYear(),
      day.getMonth(),
      day.getDate() + 1,
      IMPORT_TIMEZONE,
    )
  ) {
    days.push(
      `${day.getDate()} ${MONTH_NAMES[day.getMonth()]} ${day.getFullYear()}`,
    );
  }
  return days;
}

function localDay(text: string, now: number): Date {
  return new TZDateMini(
    parseLocalDateText(toDayText(text), null, now).startsAt,
    IMPORT_TIMEZONE,
  );
}

/** "06 NOV 26" as "6 November 2026", the format parseLocalDateText reads. */
function toDayText(text: string): string {
  const match = DAY.exec(text.trim());
  const month = match ? MONTHS[match[2].slice(0, 3).toLowerCase()] : undefined;
  if (!match || !month) throw invalid(text);
  return `${Number(match[1])} ${month} 20${match[3]}`;
}

function hasSessionInWindow(
  sessions: HliveSession[],
  window: ImportWindow,
): boolean {
  try {
    return parseHliveSessions(sessions, window).length > 0;
  } catch {
    // Keep the record so the unreadable schedule is reported by parse().
    return true;
  }
}

/**
 * The spot within the venue from "Claudelands Arena - Claudelands", unless
 * it only repeats the venue.
 */
function readPlace(location: string, venueName: string | null): string | null {
  const place = clean(location.split(/\s+-\s+/)[0] ?? '');
  if (!place) return null;
  return venueName && place.toLowerCase() === venueName.toLowerCase()
    ? null
    : place;
}

function readSessions(value: unknown): HliveSession[] {
  if (!Array.isArray(value)) {
    throw new BadRequestException('sessions must be an array');
  }
  return value.map((session: unknown) => {
    const times: unknown = isRecord(session) ? session.times : undefined;
    if (
      !isRecord(session) ||
      typeof session.days !== 'string' ||
      !Array.isArray(times) ||
      !times.every((time) => typeof time === 'string')
    ) {
      throw new BadRequestException('sessions are malformed');
    }
    return { days: session.days, times };
  });
}

function readGenres(raw: Record<string, unknown>): string[] {
  return Array.isArray(raw.genres)
    ? raw.genres.filter((genre): genre is string => typeof genre === 'string')
    : [];
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  max?: number,
): string {
  const value = readOptionalString(record, key, max);
  if (!value) throw new BadRequestException(`${key} is required`);
  return value;
}

function readUrl(record: Record<string, unknown>, key: string): string | null {
  const value = readOptionalString(record, key, 2_000);
  if (!value) return null;
  const url = parseHttpUrl(value);
  if (!url) throw new BadRequestException(`${key} must be an HTTP(S) URL`);
  return url;
}

function invalid(detail: string): BadRequestException {
  return new BadRequestException(`${LABEL} has an unreadable date "${detail}"`);
}

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
