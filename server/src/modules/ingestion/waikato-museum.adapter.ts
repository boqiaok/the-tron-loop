import { TZDateMini } from '@date-fns/tz';
import { BadRequestException, Injectable } from '@nestjs/common';
import { load, type CheerioAPI } from 'cheerio';
import { ActivityEnvironment } from '../activities/enums/activity-environment.enum';
import { ActivityScheduleMode } from '../activities/enums/activity-schedule-mode.enum';
import { DurationSource } from '../activities/enums/duration-source.enum';
import { parseCostText } from './cost-text';
import { Source } from './entities/source.entity';
import {
  getImportWindow,
  IMPORT_TIMEZONE,
  ImportWindow,
  isWithinImportWindow,
} from './import-window';
import { inferCategory } from './infer-category';
import { parseLocalDateText } from './local-date-text';
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

const LABEL = 'Waikato Museum';
const REQUEST_INTERVAL_MS = 1_000;
const MAX_PAGES = 60;
// "Open from 10am to 5pm every day (except 25 December)" on /visit.
const OPENING_HOURS = '10am - 5pm';
const CLOSING_TIME = '5pm';
const EXHIBITION_VISIT_MINUTES = 60;
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
// Every listing is at the museum; coordinates from OpenStreetMap.
const MUSEUM_VENUE = {
  name: 'Waikato Museum',
  address: '1 Grantham Street',
  suburb: 'Hamilton Central',
  latitude: -37.78978,
  longitude: 175.28661,
};

type ListingKind = 'event' | 'exhibition';

export interface MuseumPage {
  title: string;
  tagline: string | null;
  description: string;
  imageUrl: string | null;
  when: string[];
  where: string | null;
  cost: string | null;
}

/**
 * Imports Te Whare Taonga o Waikato (Waikato Museum) events and exhibitions.
 * The site has no API or feed, so the adapter reads the upcoming events and
 * exhibition listings, then each page's "When / Where / Cost" details.
 */
@Injectable()
export class WaikatoMuseumAdapter implements SourceAdapter {
  async fetch(source: Source): Promise<Record<string, unknown>[]> {
    const base = source.feedUrl.replace(/\/$/, '');
    const listings: Array<{ kind: ListingKind; url: string }> = [];
    for (const kind of ['event', 'exhibition'] as const) {
      const listUrl = `${base}/${kind}s`;
      const html = await fetchText(listUrl, {
        label: LABEL,
        accept: 'text/html',
      });
      for (const url of parseListing(html, listUrl, kind)) {
        listings.push({ kind, url });
      }
      await delay(REQUEST_INTERVAL_MS);
    }

    const window = getImportWindow();
    const records: Record<string, unknown>[] = [];
    for (const { kind, url } of listings.slice(0, MAX_PAGES)) {
      await delay(REQUEST_INTERVAL_MS);
      const page = parseMuseumPage(
        await fetchText(url, { label: LABEL, accept: 'text/html' }),
        url,
      );
      const record = toMuseumRecord(page, url, kind);
      if (hasSessionInWindow(record, window)) records.push(record);
    }
    return records;
  }

  parse(raw: Record<string, unknown>): ImportedActivity {
    return mapMuseumActivity(raw);
  }

  categorize(raw: Record<string, unknown>): SourceCategory {
    return categorizeMuseumActivity(raw);
  }
}

/**
 * Links to event or exhibition pages on the museum site. The events page
 * also lists past events, so only its "Upcoming events" section is read.
 */
export function parseListing(
  html: string,
  listUrl: string,
  kind: ListingKind,
): string[] {
  const $ = load(html);
  const origin = new URL(listUrl).origin;
  const scope = kind === 'event' ? $('#upcoming') : $('main');
  const pattern = new RegExp(`^(?:/public)?/whats-on/${kind}s/[a-z0-9-]+$`);
  const urls = new Set<string>();
  scope.find('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    const url = href ? parseHttpUrl(href, origin) : null;
    if (!url) return;
    const parsed = new URL(url);
    if (parsed.origin === origin && pattern.test(parsed.pathname)) {
      urls.add(`${parsed.origin}${parsed.pathname}`);
    }
  });
  return [...urls];
}

export function parseMuseumPage(html: string, url: string): MuseumPage {
  const $ = load(html);
  const main = $('main').first();
  const title = clean(main.find('h1').first().text());
  if (!title) throw new BadRequestException(`${LABEL} page has no title`);

  const paragraphs = [
    ...main.find('.default-list').first().find('p, li').toArray(),
    ...$('#content .default-list').find('p, li').toArray(),
  ]
    .map((element) => clean($(element).text()))
    .filter(Boolean);

  const details = new Map<string, string[]>();
  main.find('p.button').each((_, element) => {
    // Labels are bilingual, "Noo hea<br />Where": the English is the last line.
    const label = lines($, $(element).html() ?? '')
      .pop()
      ?.toLowerCase();
    const value = $(element).next('p.body-large');
    if (label && value.length) details.set(label, lines($, value.html() ?? ''));
  });

  const hero = main.find('[data-react-mount="hero"]').attr('data-element-json');
  const image = hero ? readHeroImage(hero) : null;
  const heroCost = clean(main.find('#cost').first().text());

  return {
    title,
    tagline: clean(main.find('p.h3').first().text()) || null,
    description: [...new Set(paragraphs)].join('\n\n') || title,
    imageUrl: image ? parseHttpUrl(image, url) : null,
    when: details.get('when') ?? [],
    where: details.get('where')?.join(', ') || null,
    cost: details.get('cost')?.join(', ') || heroCost || null,
  };
}

export function toMuseumRecord(
  page: MuseumPage,
  url: string,
  kind: ListingKind,
): Record<string, unknown> {
  const slug = new URL(url).pathname.split('/').filter(Boolean).pop();
  return { externalId: `${kind}/${slug}`, kind, url, ...page };
}

/** An exhibition is its own category; an event is judged by its text. */
export function categorizeMuseumActivity(
  raw: Record<string, unknown>,
): SourceCategory {
  const labels = raw.kind === 'exhibition' ? ['exhibition'] : [];
  const tagline = readOptionalString(raw, 'tagline', 500);
  const body = requireString(raw, 'description');
  return {
    category: inferCategory({
      title: requireString(raw, 'title', 200),
      labels,
      text: [tagline, body.split('\n\n')[0]].join(' '),
    }),
    labels,
  };
}

export function mapMuseumActivity(
  raw: Record<string, unknown>,
  now = Date.now(),
): ImportedActivity {
  const externalId = requireString(raw, 'externalId', 255);
  const title = requireString(raw, 'title', 200);
  const kind = raw.kind === 'exhibition' ? 'exhibition' : 'event';
  const tagline = readOptionalString(raw, 'tagline', 500);
  const where = readOptionalString(raw, 'where', 255);
  const body = requireString(raw, 'description');
  // The venue is always the museum; a room or meeting point goes in the text.
  const description =
    where && !/museum|taonga/i.test(where)
      ? `${body}\n\nWhere: ${where}.`
      : body;
  const exhibition = kind === 'exhibition';

  return {
    externalId,
    title,
    summary: (tagline ?? body.split('\n\n')[0]).slice(0, 500),
    description,
    imageUrl: readUrl(raw, 'imageUrl'),
    category: categorizeMuseumActivity(raw).category,
    environment: ActivityEnvironment.Indoor,
    scheduleMode: exhibition
      ? ActivityScheduleMode.Window
      : ActivityScheduleMode.Fixed,
    visitMinutes: exhibition ? EXHIBITION_VISIT_MINUTES : null,
    durationSource: exhibition
      ? DurationSource.CategoryDefault
      : DurationSource.Source,
    sourceUrl: readUrl(raw, 'url'),
    dates: parseMuseumSchedule(
      readStringList(raw.when),
      kind,
      getImportWindow(now),
      now,
    ),
    venue: { ...MUSEUM_VENUE },
    tags: exhibition ? ['Exhibition', 'Museum'] : ['Museum'],
    ...parseCostText(readOptionalString(raw, 'cost', 255)),
    isCancelled: false,
    raw,
  };
}

const DATE = String.raw`\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+\s+\d{4}`;
const DATE_LINE = new RegExp(
  `^(${DATE})(?:\\s*[-–—]\\s*(${DATE}))?(?:\\s+onwards)?$`,
  'i',
);

/**
 * Turns "When" lines into sessions inside the import window. Lines are dates
 * ("30th September 2026"), ranges ("1st August 2026 - 11th November 2026")
 * and one schedule line ("2pm", "Monday to Friday, 9.00am - 4.30pm", "Open
 * until 8.30pm", "Open daily 10am to 5pm"). Exhibitions without a time follow
 * the museum's opening hours; permanent ones without dates run every day.
 */
export function parseMuseumSchedule(
  whenLines: string[],
  kind: ListingKind,
  window: ImportWindow,
  now = Date.now(),
): ImportedActivityDate[] {
  const days: LocalDay[] = [];
  const scheduleLines: string[] = [];
  for (const line of whenLines) {
    const match = DATE_LINE.exec(line);
    if (!match) {
      scheduleLines.push(line);
      continue;
    }
    const first = localDay(match[1], now);
    days.push(
      ...(match[2]
        ? dayRange(first, localDay(match[2], now), window)
        : [first]),
    );
  }

  const schedule = parseScheduleLine(scheduleLines.join(' '));
  const time = schedule.time ?? (kind === 'exhibition' ? OPENING_HOURS : null);
  const candidates =
    days.length || !schedule.daily
      ? days
      : dayRange(dayOf(window.startsAt), dayOf(window.endsAt), window);

  const dates = candidates
    .filter((day) => schedule.weekdays.includes(day.weekday))
    // The galleries close on 25 December.
    .filter(
      (day) => !(kind === 'exhibition' && day.month === 11 && day.date === 25),
    )
    .map((day) => parseLocalDateText(day.text, time, now))
    .filter((date) => isWithinImportWindow(date.startsAt, window));
  return [...new Map(dates.map((date) => [date.startsAt, date])).values()].sort(
    (left, right) => left.startsAt.localeCompare(right.startsAt),
  );
}

interface LocalDay {
  year: number;
  month: number;
  date: number;
  weekday: number;
  text: string;
}

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

function parseScheduleLine(line: string): {
  time: string | null;
  weekdays: number[];
  daily: boolean;
} {
  let text = line.replace(/\s+/g, ' ').trim();
  let weekdays = EVERY_DAY;
  let daily = false;

  const prefix =
    /^(open daily|daily|every day|monday to friday|weekdays|weekends)\b,?\s*/i.exec(
      text,
    );
  if (prefix) {
    const words = prefix[1].toLowerCase();
    if (words === 'monday to friday' || words === 'weekdays') {
      weekdays = [1, 2, 3, 4, 5];
    } else if (words === 'weekends') {
      weekdays = [0, 6];
    } else {
      daily = true;
    }
    text = text.slice(prefix[0].length);
  }
  const until = /^open until\s+(.+)$/i.exec(text);
  if (until) text = `${CLOSING_TIME} - ${until[1]}`;
  return { time: text || null, weekdays, daily };
}

function localDay(text: string, now: number): LocalDay {
  return dayOf(parseLocalDateText(text, null, now).startsAt);
}

function dayOf(iso: string): LocalDay {
  const date = new TZDateMini(iso, IMPORT_TIMEZONE);
  return makeDay(date.getFullYear(), date.getMonth(), date.getDate());
}

function makeDay(year: number, month: number, date: number): LocalDay {
  // TZDateMini normalises overflow, e.g. 32 September becomes 2 October.
  const day = new TZDateMini(year, month, date, IMPORT_TIMEZONE);
  return {
    year: day.getFullYear(),
    month: day.getMonth(),
    date: day.getDate(),
    weekday: day.getDay(),
    text: `${day.getDate()} ${MONTHS[day.getMonth()]} ${day.getFullYear()}`,
  };
}

/** Each day from `from` to `to`, clipped to the import window. */
function dayRange(
  from: LocalDay,
  to: LocalDay,
  window: ImportWindow,
): LocalDay[] {
  const first = dayOf(window.startsAt);
  const last = dayOf(window.endsAt);
  const start = dayValue(from) >= dayValue(first) ? from : first;
  const end = dayValue(to) <= dayValue(last) ? to : last;
  const days: LocalDay[] = [];
  for (
    let day = start;
    dayValue(day) <= dayValue(end);
    day = makeDay(day.year, day.month, day.date + 1)
  ) {
    days.push(day);
  }
  return days;
}

function dayValue(day: LocalDay): number {
  return day.year * 10_000 + day.month * 100 + day.date;
}

function hasSessionInWindow(
  record: Record<string, unknown>,
  window: ImportWindow,
): boolean {
  try {
    return (
      parseMuseumSchedule(
        readStringList(record.when),
        record.kind === 'exhibition' ? 'exhibition' : 'event',
        window,
      ).length > 0
    );
  } catch {
    // Keep the record so the unreadable schedule is reported by parse().
    return true;
  }
}

function readHeroImage(json: string): string | null {
  try {
    const hero: unknown = JSON.parse(json);
    const images =
      isRecord(hero) && Array.isArray(hero.images) ? hero.images : [];
    const first: unknown = images[0];
    return isRecord(first) && typeof first.url === 'string' ? first.url : null;
  } catch {
    return null;
  }
}

function lines($: CheerioAPI, html: string): string[] {
  return html
    .split(/<br\s*\/?>/i)
    .map((fragment) => clean($('<div>').html(fragment).text()))
    .filter(Boolean);
}

function readStringList(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === 'string')
  ) {
    throw new BadRequestException('Expected an array of strings');
  }
  return value;
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

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
