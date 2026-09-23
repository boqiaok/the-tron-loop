import { BadRequestException, Injectable } from '@nestjs/common';
import { load } from 'cheerio';
import { ActivityCostType } from '../activities/enums/activity-cost-type.enum';
import { ActivityEnvironment } from '../activities/enums/activity-environment.enum';
import { createSlug } from '../activities/activity-slug';
import { Source } from './entities/source.entity';
import {
  getImportWindow,
  ImportWindow,
  isWithinImportWindow,
} from './import-window';
import { inferCategory } from './infer-category';
import { parseLocalDateText } from './local-date-text';
import {
  ImportedActivity,
  ImportedActivityDate,
  SourceAdapter,
} from './source-adapter';
import {
  delay,
  fetchJson,
  fetchText,
  isRecord,
  parseHttpUrl,
  readOptionalString,
} from './source-http';

const LABEL = 'Hamilton Libraries';
const MAX_EVENTS = 200;
const REQUEST_INTERVAL_MS = 1_000;

/**
 * Library pages give a street address but no coordinates, and planning needs
 * coordinates to estimate travel. The seven branches are fixed buildings, so
 * their OpenStreetMap positions are kept here, keyed by library page slug.
 * Hillcrest Library uses the Hamilton Gardens main entrance on Cobham Drive.
 */
const LIBRARY_COORDINATES: Record<
  string,
  { latitude: number; longitude: number }
> = {
  'central-library': { latitude: -37.78808, longitude: 175.28251 },
  'chartwell-library': { latitude: -37.75155, longitude: 175.27829 },
  'dinsdale-library': { latitude: -37.7945, longitude: 175.24608 },
  'glenview-library': { latitude: -37.82295, longitude: 175.28787 },
  'hillcrest-library-at-hamilton-gardens': {
    latitude: -37.80622,
    longitude: 175.30429,
  },
  'st-andrews-library': { latitude: -37.75775, longitude: 175.25856 },
  'te-kete-aronui': { latitude: -37.72036, longitude: 175.25886 },
};

export interface LibrarySession {
  day: string;
  time: string | null;
}

export interface LibraryLocation {
  name: string;
  libraryUrl: string | null;
  sessions: LibrarySession[];
}

export interface LibraryEventPage {
  title: string;
  description: string;
  imageUrl: string | null;
  eventTypes: string[];
  audiences: string[];
  cost: string | null;
  locations: LibraryLocation[];
}

/**
 * Imports the Hamilton City Libraries "What's On" listing. The site has no
 * API or calendar feed, so the adapter reads the listing's "load more"
 * endpoint and each event page. An event that runs on different schedules at
 * several libraries becomes one activity per library, each with its venue.
 */
@Injectable()
export class HamiltonLibrariesAdapter implements SourceAdapter {
  async fetch(source: Source): Promise<Record<string, unknown>[]> {
    const window = getImportWindow();
    const eventUrls = await listEventUrls(source.feedUrl, window);
    const addresses = new Map<string, string | null>();
    const records: Record<string, unknown>[] = [];

    for (const url of eventUrls) {
      await delay(REQUEST_INTERVAL_MS);
      const page = parseEventPage(
        await fetchText(url, { label: LABEL, accept: 'text/html' }),
        url,
      );
      const locations = page.locations.filter((location) =>
        hasSessionInWindow(location.sessions, window),
      );
      for (const { libraryUrl } of locations) {
        if (!libraryUrl || addresses.has(libraryUrl)) continue;
        await delay(REQUEST_INTERVAL_MS);
        const html = await fetchText(libraryUrl, {
          label: LABEL,
          accept: 'text/html',
        });
        addresses.set(libraryUrl, parseLibraryAddress(html));
      }
      records.push(...toLibraryRecords(page, url, locations, addresses));
    }
    return records;
  }

  parse(raw: Record<string, unknown>): ImportedActivity {
    return mapLibraryActivity(raw);
  }
}

async function listEventUrls(
  feedUrl: string,
  window: ImportWindow,
): Promise<string[]> {
  const urls = new Set<string>();
  let offset = 0;
  for (;;) {
    const endpoint = new URL(`${feedUrl.replace(/\/$/, '')}/loadmore`);
    endpoint.search = new URLSearchParams({
      when: 'custom',
      start: window.startDate,
      end: window.endDate,
      offset: String(offset),
    }).toString();
    const page = readListingPage(await fetchJson(endpoint, { label: LABEL }));
    for (const url of parseEventListing(page.html, feedUrl)) urls.add(url);

    if (!page.hasMore || page.nextOffset <= offset || urls.size >= MAX_EVENTS) {
      break;
    }
    offset = page.nextOffset;
    await delay(REQUEST_INTERVAL_MS);
  }
  return [...urls].slice(0, MAX_EVENTS);
}

function readListingPage(payload: unknown): {
  html: string;
  hasMore: boolean;
  nextOffset: number;
} {
  if (
    !isRecord(payload) ||
    typeof payload.html !== 'string' ||
    typeof payload.hasMore !== 'boolean'
  ) {
    throw new BadRequestException(`${LABEL} returned an unexpected listing`);
  }
  const nextOffset = Number(payload.nextOffset);
  return {
    html: payload.html,
    hasMore: payload.hasMore && Number.isInteger(nextOffset),
    nextOffset,
  };
}

/** Returns unique event page URLs on the listing's own site. */
export function parseEventListing(html: string, feedUrl: string): string[] {
  const $ = load(html);
  const listing = new URL(feedUrl);
  const prefix = `${listing.pathname.replace(/\/$/, '')}/`;
  const urls = new Set<string>();
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    const url = href ? parseHttpUrl(href, listing.origin) : null;
    if (!url) return;
    const parsed = new URL(url);
    if (
      parsed.origin === listing.origin &&
      parsed.pathname.startsWith(prefix) &&
      parsed.pathname.length > prefix.length &&
      !parsed.pathname.endsWith('/loadmore')
    ) {
      parsed.hash = '';
      parsed.search = '';
      urls.add(parsed.toString());
    }
  });
  return [...urls];
}

export function parseEventPage(html: string, url: string): LibraryEventPage {
  const $ = load(html);
  const main = $('main').first();
  const title = clean(main.find('h1').first().text());
  if (!title) throw new BadRequestException(`${LABEL} event has no title`);

  const paragraphs = main
    .find('.default-list')
    .first()
    .find('p, li')
    .map((_, element) => clean($(element).text()))
    .get()
    .filter(Boolean);

  const fields = new Map<string, string>();
  main.find('span.text-sm.font-bold').each((_, element) => {
    const label = clean($(element).text()).toLowerCase();
    const value = clean($(element).next('span').text());
    if (label && value) fields.set(label, value);
  });

  const image = main.find('img[src*="/assets/"]').first().attr('src');
  const locations = main
    .find('h3')
    .map((_, heading) => {
      const block = $(heading).closest('div:has(ul)');
      const libraryHref = block
        .find('a[href*="/location-and-hours/"]')
        .first()
        .attr('href');
      const sessions = block
        .find('li')
        .map((__, item) => {
          const parts = $(item)
            .find('span')
            .map((___, span) => clean($(span).text()))
            .get();
          return parts[0] ? { day: parts[0], time: parts[1] || null } : null;
        })
        .get()
        .filter((session): session is LibrarySession => session !== null);
      return {
        name: clean($(heading).text()),
        libraryUrl: libraryHref ? parseHttpUrl(libraryHref, url) : null,
        sessions,
      };
    })
    .get()
    .filter((location) => location.name && location.sessions.length);

  return {
    title,
    description: paragraphs.join('\n\n') || title,
    imageUrl: image ? parseHttpUrl(image, url) : null,
    eventTypes: splitList(fields.get('type of event')),
    audiences: splitList(fields.get("who's it for")),
    cost: fields.get('cost') ?? null,
    locations,
  };
}

/**
 * Builds raw records for one event page. When every library runs the same
 * sessions (a city-wide competition or display), the event is one activity
 * without a single venue rather than identical copies per library.
 */
export function toLibraryRecords(
  page: LibraryEventPage,
  url: string,
  locations: LibraryLocation[],
  addresses: Map<string, string | null>,
): Record<string, unknown>[] {
  const eventSlug = lastPathSegment(url);
  const event = {
    url,
    title: page.title,
    description: page.description,
    imageUrl: page.imageUrl,
    eventTypes: page.eventTypes,
    audiences: page.audiences,
    cost: page.cost,
  };
  const [first] = locations;
  const sessionKey = (location: LibraryLocation) =>
    JSON.stringify(location.sessions);
  if (
    first &&
    locations.length > 1 &&
    locations.every((location) => sessionKey(location) === sessionKey(first))
  ) {
    return [
      {
        externalId: eventSlug,
        ...event,
        library: null,
        libraries: locations.map((location) => location.name),
        sessions: first.sessions,
      },
    ];
  }

  return locations.map((location) => {
    const librarySlug = location.libraryUrl
      ? lastPathSegment(location.libraryUrl)
      : createSlug(location.name);
    const coordinates = LIBRARY_COORDINATES[librarySlug];
    return {
      externalId: `${eventSlug}#${librarySlug}`,
      ...event,
      library: {
        name: location.name,
        url: location.libraryUrl,
        address: location.libraryUrl
          ? (addresses.get(location.libraryUrl) ?? null)
          : null,
        latitude: coordinates?.latitude ?? null,
        longitude: coordinates?.longitude ?? null,
      },
      libraries: [location.name],
      sessions: location.sessions,
    };
  });
}

/** Reads the street address from a library page's directions link. */
export function parseLibraryAddress(html: string): string | null {
  const $ = load(html);
  const href = $('a[href*="google.com/maps/dir"]').first().attr('href');
  if (!href) return null;
  const destination = new URL(href, 'https://www.google.com').searchParams.get(
    'destination',
  );
  return destination
    ? clean(destination.replace(/,\s*New Zealand$/i, '')) || null
    : null;
}

export function mapLibraryActivity(
  raw: Record<string, unknown>,
  now = Date.now(),
): ImportedActivity {
  const externalId = requireString(raw, 'externalId', 255);
  const title = requireString(raw, 'title', 200);
  const library = isRecord(raw.library) ? raw.library : null;
  const libraries = readStringList(raw.libraries);
  const description = library
    ? requireString(raw, 'description')
    : `${requireString(raw, 'description')}\n\nAvailable at: ${libraries.join(', ')}.`;
  const eventTypes = readStringList(raw.eventTypes);
  const audiences = readStringList(raw.audiences);
  const window = getImportWindow(now);

  const dates = uniqueDates(
    readSessions(raw.sessions)
      .map((session) => parseLocalDateText(session.day, session.time, now))
      .filter((date) => isWithinImportWindow(date.startsAt, window)),
  );

  return {
    externalId,
    title,
    summary: description.split('\n\n')[0].slice(0, 500),
    description,
    imageUrl: readUrl(raw, 'imageUrl'),
    category: inferCategory(title, [...eventTypes, ...audiences].join(' ')),
    environment: ActivityEnvironment.Indoor,
    sourceUrl: readUrl(raw, 'url'),
    dates,
    venue: library
      ? {
          name: requireString(library, 'name', 200),
          address: readOptionalString(library, 'address', 500),
          suburb: null,
          latitude: readCoordinate(library.latitude, -90, 90),
          longitude: readCoordinate(library.longitude, -180, 180),
        }
      : null,
    tags: [...new Set([...eventTypes, ...audiences])],
    ...mapCost(readOptionalString(raw, 'cost', 255)),
    isCancelled: false,
    raw,
  };
}

function mapCost(
  cost: string | null,
): Pick<ImportedActivity, 'costType' | 'costAmountFrom' | 'costDetails'> {
  if (!cost) {
    return {
      costType: ActivityCostType.Unknown,
      costAmountFrom: null,
      costDetails: null,
    };
  }
  if (/^free\b/i.test(cost)) {
    return {
      costType: ActivityCostType.Free,
      costAmountFrom: 0,
      costDetails: 'Free',
    };
  }
  const amount = /\$\s*(\d+(?:\.\d{1,2})?)/.exec(cost);
  return {
    costType: amount ? ActivityCostType.Paid : ActivityCostType.Unknown,
    costAmountFrom: amount ? Number(amount[1]) : null,
    costDetails: cost,
  };
}

function hasSessionInWindow(
  sessions: LibrarySession[],
  window: ImportWindow,
): boolean {
  return sessions.some((session) => {
    try {
      const date = parseLocalDateText(session.day, session.time);
      return isWithinImportWindow(date.startsAt, window);
    } catch {
      // Keep the record so the unreadable date is reported by parse().
      return true;
    }
  });
}

function readSessions(value: unknown): LibrarySession[] {
  if (!Array.isArray(value) || !value.length) {
    throw new BadRequestException('sessions must be a non-empty array');
  }
  return value.map((session) => {
    if (!isRecord(session)) {
      throw new BadRequestException('Every session must be an object');
    }
    return {
      day: requireString(session, 'day', 100),
      time: readOptionalString(session, 'time', 100),
    };
  });
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

function readCoordinate(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || value < minimum || value > maximum) {
    throw new BadRequestException('Library coordinates are invalid');
  }
  return value;
}

function readUrl(record: Record<string, unknown>, key: string): string | null {
  const value = readOptionalString(record, key, 2_000);
  if (!value) return null;
  const url = parseHttpUrl(value);
  if (!url) throw new BadRequestException(`${key} must be an HTTP(S) URL`);
  return url;
}

function uniqueDates(dates: ImportedActivityDate[]): ImportedActivityDate[] {
  return [
    ...new Map(dates.map((date) => [date.startsAt, date] as const)).values(),
  ].sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

function splitList(value: string | undefined): string[] {
  return value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function lastPathSegment(url: string): string {
  return new URL(url).pathname.split('/').filter(Boolean).pop() ?? url;
}

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
