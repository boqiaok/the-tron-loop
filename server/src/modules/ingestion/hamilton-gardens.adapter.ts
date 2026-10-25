import { BadRequestException, Injectable } from '@nestjs/common';
import { load, type CheerioAPI } from 'cheerio';
import { ActivityEnvironment } from '../activities/enums/activity-environment.enum';
import { parseCostText } from './cost-text';
import { Source } from './entities/source.entity';
import {
  getImportWindow,
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
  parseHttpUrl,
  readOptionalString,
} from './source-http';

const LABEL = 'Hamilton Gardens';
const REQUEST_INTERVAL_MS = 1_000;
const MAX_LISTING_PAGES = 5;
const MAX_EVENTS = 40;
// Every listing is at the gardens; coordinates match the Eventfinda venue.
const GARDENS_VENUE = {
  name: 'Hamilton Gardens',
  address: 'Hungerford Crescent',
  suburb: null,
  latitude: -37.8057,
  longitude: 175.3049,
};

export interface GardensListing {
  url: string;
  summary: string | null;
  /** The card's date, such as "29 October 2026": the next or only day. */
  date: string;
  imageUrl: string | null;
}

export interface GardensPage {
  title: string;
  lines: string[];
  imageUrl: string | null;
}

/**
 * Imports the events Hamilton Gardens runs itself. The site has no API or
 * feed, so the adapter reads the What's On cards for each event's next date,
 * then each page's text for its sessions and cost.
 */
@Injectable()
export class HamiltonGardensAdapter implements SourceAdapter {
  async fetch(source: Source): Promise<Record<string, unknown>[]> {
    const listings = new Map<string, GardensListing>();
    const pages = [source.feedUrl];
    for (
      let index = 0;
      index < pages.length && index < MAX_LISTING_PAGES;
      index += 1
    ) {
      if (index) await delay(REQUEST_INTERVAL_MS);
      const html = await fetchText(pages[index], {
        label: LABEL,
        accept: 'text/html',
      });
      const listing = parseListing(html, pages[index]);
      for (const card of listing.cards) listings.set(card.url, card);
      for (const page of listing.pages) {
        if (!pages.includes(page)) pages.push(page);
      }
    }

    const window = getImportWindow();
    const records: Record<string, unknown>[] = [];
    for (const listing of [...listings.values()].slice(0, MAX_EVENTS)) {
      await delay(REQUEST_INTERVAL_MS);
      const page = parseGardensPage(
        await fetchText(listing.url, { label: LABEL, accept: 'text/html' }),
        listing.url,
      );
      const record = toGardensRecord(listing, page);
      if (hasSessionInWindow(record, window)) records.push(record);
    }
    return records;
  }

  parse(raw: Record<string, unknown>): ImportedActivity {
    return mapGardensActivity(raw);
  }

  categorize(raw: Record<string, unknown>): SourceCategory {
    return categorizeGardensActivity(raw);
  }
}

/** Event cards and further listing pages on the What's On page. */
export function parseListing(
  html: string,
  pageUrl: string,
): { cards: GardensListing[]; pages: string[] } {
  const $ = load(html);
  const listing = new URL(pageUrl);
  const cards = new Map<string, GardensListing>();
  $('main a[href]').each((_, element) => {
    const card = $(element);
    const url = parseHttpUrl(card.attr('href') ?? '', listing.origin);
    if (!url) return;
    const parsed = new URL(url);
    const date = clean(card.find('span').last().text());
    if (
      parsed.origin !== listing.origin ||
      !parsed.pathname.startsWith(`${listing.pathname.replace(/\/$/, '')}/`) ||
      !card.find('h3').length ||
      !date
    ) {
      return;
    }
    const image = card.find('img').attr('src');
    cards.set(url, {
      url: `${parsed.origin}${parsed.pathname}`,
      summary: clean(card.find('p').first().text()) || null,
      date,
      imageUrl: image ? parseHttpUrl(image, listing.origin) : null,
    });
  });

  const pages = new Set<string>();
  $('.pagination a[href]').each((_, element) => {
    const url = parseHttpUrl($(element).attr('href') ?? '', pageUrl);
    if (url && new URL(url).pathname === listing.pathname) pages.add(url);
  });
  return { cards: [...cards.values()], pages: [...pages] };
}

export function parseGardensPage(html: string, url: string): GardensPage {
  const $ = load(html);
  const main = $('main').first();
  const title = clean(main.find('h1').first().text());
  if (!title) throw new BadRequestException(`${LABEL} page has no title`);

  // Content blocks have element ids such as "e1208"; the rest is page chrome.
  const blocks = main
    .find('[id^="e"]')
    .filter((_, element) => /^e\d+$/.test($(element).attr('id') ?? ''));
  const lineList = blocks
    .find('h2, h3, p, li, div')
    .filter(
      (_, element) =>
        $(element).children('h2, h3, p, li, div, ul').length === 0,
    )
    .toArray()
    .flatMap((element) => lines($, $(element).html() ?? ''));

  const banner = /url\(([^)]+)\)/.exec(
    main.find('[style*="background-image"]').first().attr('style') ?? '',
  );
  return {
    title,
    lines: [...new Set(lineList)],
    imageUrl: banner ? parseHttpUrl(banner[1].replace(/["']/g, ''), url) : null,
  };
}

export function toGardensRecord(
  listing: GardensListing,
  page: GardensPage,
): Record<string, unknown> {
  const slug = new URL(listing.url).pathname.split('/').filter(Boolean).pop();
  return {
    externalId: slug,
    url: listing.url,
    title: page.title,
    summary: listing.summary,
    date: listing.date,
    lines: page.lines,
    imageUrl: page.imageUrl ?? listing.imageUrl,
  };
}

export function categorizeGardensActivity(
  raw: Record<string, unknown>,
): SourceCategory {
  return {
    category: inferCategory({
      title: requireString(raw, 'title', 200),
      text: readOptionalString(raw, 'summary', 500),
    }),
    labels: [],
  };
}

export function mapGardensActivity(
  raw: Record<string, unknown>,
  now = Date.now(),
): ImportedActivity {
  const title = requireString(raw, 'title', 200);
  const summary = readOptionalString(raw, 'summary', 500);
  const pageLines = readStringList(raw.lines);

  return {
    externalId: requireString(raw, 'externalId', 255),
    title,
    summary,
    description: pageLines.join('\n\n') || summary || title,
    imageUrl: readUrl(raw, 'imageUrl'),
    category: categorizeGardensActivity(raw).category,
    environment: ActivityEnvironment.Outdoor,
    sourceUrl: readUrl(raw, 'url'),
    dates: parseGardensSchedule(
      requireString(raw, 'date', 100),
      pageLines,
      getImportWindow(now),
      now,
    ),
    venue: { ...GARDENS_VENUE },
    tags: [],
    ...parseCostText(readCost(pageLines)),
    isCancelled: false,
    raw,
  };
}

const SESSION_LINE = new RegExp(
  String.raw`^((?:[a-z]+day,?\s+)?\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+\s+\d{4})\s*[-–—:,]\s*(.+)$`,
  'i',
);

/**
 * Sessions from page lines such as "Thursday 29 October 2026 - 7:50pm
 * arrival". A page without them is held on the card's date, at the times
 * given beside that day ("Sunday 1 November between 11.00am - 2.00pm"), or
 * all day when no time is given.
 */
export function parseGardensSchedule(
  cardDate: string,
  pageLines: string[],
  window: ImportWindow,
  now = Date.now(),
): ImportedActivityDate[] {
  const sessions = pageLines.flatMap((line) => {
    const match = SESSION_LINE.exec(line);
    const time = match ? findTimeText(match[2]) : null;
    return match && time ? [parseLocalDateText(match[1], time, now)] : [];
  });
  if (!sessions.length) {
    const [dayNumber, month] = cardDate.split(/\s+/);
    const mention = new RegExp(`\\b${dayNumber}\\s+${month}\\b`, 'i');
    const time = pageLines
      .map((line) => mention.exec(line))
      .map((match) =>
        match ? findTimeText(match.input.slice(match.index)) : null,
      )
      .find((value) => value !== null);
    sessions.push(parseLocalDateText(cardDate, time ?? null, now));
  }

  const inWindow = sessions.filter((date) =>
    isWithinImportWindow(date.startsAt, window),
  );
  return [
    ...new Map(inWindow.map((date) => [date.startsAt, date])).values(),
  ].sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

/** "Cost: Adults $29.50" or a "Tickets:" heading followed by the price. */
function readCost(pageLines: string[]): string | null {
  for (const [index, line] of pageLines.entries()) {
    const match = /^(?:cost|price|tickets?)\s*:\s*(.*)$/i.exec(line);
    if (match) return match[1] || pageLines[index + 1] || null;
  }
  return null;
}

function hasSessionInWindow(
  record: Record<string, unknown>,
  window: ImportWindow,
): boolean {
  try {
    return (
      parseGardensSchedule(
        requireString(record, 'date', 100),
        readStringList(record.lines),
        window,
      ).length > 0
    );
  } catch {
    // Keep the record so the unreadable schedule is reported by parse().
    return true;
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
