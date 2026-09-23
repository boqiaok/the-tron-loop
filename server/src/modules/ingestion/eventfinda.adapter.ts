import { TZDateMini } from '@date-fns/tz';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActivityCostType } from '../activities/enums/activity-cost-type.enum';
import { Source } from './entities/source.entity';
import { getImportWindow, isWithinImportWindow } from './import-window';
import { inferCategory } from './infer-category';
import {
  ImportedActivity,
  ImportedActivityDate,
  SourceAdapter,
} from './source-adapter';
import {
  delay,
  fetchJson,
  isRecord,
  parseHttpUrl,
  readOptionalString,
} from './source-http';

const PAGE_SIZE = 20;
const MAX_EVENTS = 500;
const REQUEST_INTERVAL_MS = 1_050;

@Injectable()
export class EventfindaAdapter implements SourceAdapter {
  constructor(private readonly configService: ConfigService) {}

  async fetch(source: Source): Promise<Record<string, unknown>[]> {
    const username = this.configService.get<string>('EVENTFINDA_USERNAME');
    const password = this.configService.get<string>('EVENTFINDA_PASSWORD');
    if (!username || !password) {
      throw new BadRequestException(
        'Eventfinda credentials are not configured',
      );
    }

    const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    const window = getImportWindow();
    const events: Record<string, unknown>[] = [];
    let total = 0;
    let offset = 0;

    do {
      const url = new URL(source.feedUrl);
      url.search = new URLSearchParams({
        rows: String(PAGE_SIZE),
        offset: String(offset),
        location_slug: 'hamilton',
        start_date: window.startDate,
        end_date: window.endDate,
        order: 'date',
      }).toString();

      const page = readPage(
        await fetchJson(url, {
          label: 'Eventfinda',
          headers: { Authorization: authorization },
        }),
      );
      total = Math.min(page.total, MAX_EVENTS);
      events.push(...page.events.slice(0, MAX_EVENTS - events.length));
      offset += PAGE_SIZE;
      if (offset < total && events.length < MAX_EVENTS) {
        await delay(REQUEST_INTERVAL_MS);
      }
    } while (offset < total && events.length < MAX_EVENTS);

    return events;
  }

  parse(raw: Record<string, unknown>): ImportedActivity {
    return mapEventfindaActivity(raw);
  }
}

function readPage(payload: unknown): {
  total: number;
  events: Record<string, unknown>[];
} {
  if (!isRecord(payload) || !Array.isArray(payload.events)) {
    throw new BadRequestException('Eventfinda returned an unexpected response');
  }
  const attributes = payload['@attributes'];
  const count = isRecord(attributes) ? Number(attributes.count) : NaN;
  if (
    !Number.isInteger(count) ||
    count < 0 ||
    !payload.events.every(isRecord)
  ) {
    throw new BadRequestException('Eventfinda returned an invalid event page');
  }

  return { total: count, events: payload.events };
}

function mapEventfindaActivity(raw: Record<string, unknown>): ImportedActivity {
  const window = getImportWindow();
  const externalId = String(readNumber(raw, 'id'));
  const title = readString(raw, 'name', 200);
  const timezone =
    readOptionalString(raw, 'timezone', 64) ?? 'Pacific/Auckland';
  const sessions = readCollection(raw.sessions, 'sessions');
  const dates = uniqueDates(
    sessions
      .filter((session) => session.is_cancelled !== true)
      .map((session) => mapSession(session, timezone))
      .filter((date) => isWithinImportWindow(date.startsAt, window)),
  );

  if (sessions.length === 0 && raw.is_cancelled !== true) {
    dates.push({
      startsAt: parseLocalDateTime(readString(raw, 'datetime_start'), timezone),
      endsAt: parseOptionalLocalDateTime(raw.datetime_end, timezone),
      timezone,
      isAllDay: false,
    });
  }

  const description = readOptionalString(raw, 'description') ?? title;
  const location = isRecord(raw.location) ? raw.location : null;
  const point = location && isRecord(location.point) ? location.point : null;
  const latitude = location
    ? readCoordinate(location.latitude ?? point?.lat, -90, 90)
    : null;
  const longitude = location
    ? readCoordinate(location.longitude ?? point?.lng, -180, 180)
    : null;
  const coordinates = isHamiltonRegion(latitude, longitude)
    ? { latitude, longitude }
    : { latitude: null, longitude: null };
  const category = isRecord(raw.category) ? raw.category : null;
  const prices = readPrices(raw.ticket_types);
  const isFree = raw.is_free === true;

  return {
    externalId,
    title,
    summary: description.slice(0, 500),
    description,
    imageUrl: readPrimaryImage(raw.images),
    category: inferCategory(
      title,
      category ? readString(category, 'name', 120) : null,
    ),
    sourceUrl: readOptionalUrl(raw, 'url'),
    dates,
    venue: location
      ? {
          name: readString(location, 'name', 200),
          address: readOptionalString(raw, 'address'),
          suburb: null,
          ...coordinates,
        }
      : null,
    tags: category ? [readString(category, 'name', 120)] : [],
    costType: isFree
      ? ActivityCostType.Free
      : prices.length
        ? ActivityCostType.Paid
        : ActivityCostType.Unknown,
    costAmountFrom: isFree ? 0 : prices.length ? Math.min(...prices) : null,
    costDetails: isFree
      ? 'Free admission'
      : prices.length
        ? `Tickets from NZ$${Math.min(...prices).toFixed(2)}`
        : null,
    isCancelled: raw.is_cancelled === true || dates.length === 0,
    raw,
  };
}

function mapSession(
  session: Record<string, unknown>,
  fallbackTimezone: string,
): ImportedActivityDate {
  const timezone =
    readOptionalString(session, 'timezone', 64) ?? fallbackTimezone;
  return {
    startsAt: parseLocalDateTime(
      readString(session, 'datetime_start'),
      timezone,
    ),
    endsAt: parseOptionalLocalDateTime(session.datetime_end, timezone),
    timezone,
    isAllDay: false,
  };
}

function parseOptionalLocalDateTime(
  value: unknown,
  timezone: string,
): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') {
    throw new BadRequestException('Eventfinda returned an invalid date');
  }
  return parseLocalDateTime(value, timezone);
}

function parseLocalDateTime(value: string, timezone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(
    value,
  );
  if (!match) {
    throw new BadRequestException('Eventfinda returned an invalid date');
  }
  const [, year, month, day, hour, minute, second] = match;
  const date = new TZDateMini(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    timezone,
  );
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Eventfinda returned an invalid timezone');
  }
  return date.toISOString();
}

function readPrices(collection: unknown): number[] {
  return readCollection(collection, 'ticket_types')
    .map((ticket) => Number(ticket.price))
    .filter((price) => Number.isFinite(price) && price >= 0);
}

function uniqueDates(dates: ImportedActivityDate[]): ImportedActivityDate[] {
  return [
    ...new Map(dates.map((date) => [date.startsAt, date] as const)).values(),
  ].sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

function readPrimaryImage(collection: unknown): string | null {
  const images = readCollection(collection, 'images');
  const image =
    images.find((candidate) => candidate.is_primary === true) ?? images[0];
  if (!image) return null;

  const transforms = readCollection(image.transforms, 'transforms')
    .map((transform) => ({
      url: typeof transform.url === 'string' ? transform.url : null,
      width: Number(transform.width),
    }))
    .filter(
      (transform): transform is { url: string; width: number } =>
        Boolean(transform.url) && Number.isFinite(transform.width),
    )
    .sort((left, right) => right.width - left.width);
  const preferred = transforms.find((transform) => transform.width <= 650);
  const url = preferred?.url ?? readOptionalString(image, 'original_url');
  return url ? validateUrl(url) : null;
}

function readCollection(
  value: unknown,
  key: string,
): Record<string, unknown>[] {
  if (!isRecord(value) || !Array.isArray(value[key])) return [];
  return value[key].filter(isRecord);
}

function readString(
  record: Record<string, unknown>,
  key: string,
  max = 10_000,
): string {
  const value = readOptionalString(record, key, max);
  if (!value) {
    throw new BadRequestException(`Eventfinda ${key} is required`);
  }
  return value;
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = Number(record[key]);
  if (!Number.isFinite(value)) {
    throw new BadRequestException(`Eventfinda ${key} is invalid`);
  }
  return value;
}

function readCoordinate(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

function isHamiltonRegion(
  latitude: number | null,
  longitude: number | null,
): latitude is number {
  return (
    latitude !== null &&
    longitude !== null &&
    latitude >= -38.2 &&
    latitude <= -37.3 &&
    longitude >= 174.8 &&
    longitude <= 175.8
  );
}

function readOptionalUrl(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = readOptionalString(record, key, 2_000);
  return value ? validateUrl(value) : null;
}

function validateUrl(value: string): string {
  const url = parseHttpUrl(value);
  if (!url) throw new BadRequestException('Eventfinda returned an invalid URL');
  return url;
}
