import { BadRequestException, Injectable } from '@nestjs/common';
import { ActivityCostType } from '../activities/enums/activity-cost-type.enum';
import { Source } from './entities/source.entity';
import { ImportedActivity, SourceAdapter } from './source-adapter';

@Injectable()
export class JsonFeedAdapter implements SourceAdapter {
  async fetch(source: Source): Promise<Record<string, unknown>[]> {
    const response = await fetch(source.feedUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new BadRequestException(`Source returned HTTP ${response.status}`);
    }

    const text = await response.text();
    if (text.length > 2_000_000) {
      throw new BadRequestException('Source response exceeds 2 MB');
    }

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new BadRequestException('Source did not return valid JSON');
    }

    if (
      !isRecord(payload) ||
      !Array.isArray(payload.items) ||
      payload.items.length > 500
    ) {
      throw new BadRequestException(
        'Source JSON must contain an items array with at most 500 entries',
      );
    }
    if (!payload.items.every(isRecord)) {
      throw new BadRequestException('Every source item must be an object');
    }

    return payload.items;
  }

  parse(raw: Record<string, unknown>): ImportedActivity {
    return parseFeedActivity(raw);
  }
}

function parseFeedActivity(raw: Record<string, unknown>): ImportedActivity {
  const externalId = readRequiredString(raw, 'externalId', 255);
  const title = readRequiredString(raw, 'title', 200);
  const startsAt = readRequiredDate(raw, 'startsAt');
  const endsAt = readOptionalDate(raw, 'endsAt');
  if (endsAt && new Date(endsAt) <= new Date(startsAt)) {
    throw new BadRequestException('endsAt must be later than startsAt');
  }

  const costType =
    readOptionalString(raw, 'costType') ?? ActivityCostType.Unknown;
  if (!Object.values(ActivityCostType).includes(costType as ActivityCostType)) {
    throw new BadRequestException('costType is invalid');
  }

  const tags = raw.tags ?? [];
  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === 'string')) {
    throw new BadRequestException('tags must be an array of strings');
  }

  const venue = raw.venue;
  if (venue !== undefined && venue !== null && !isRecord(venue)) {
    throw new BadRequestException('venue must be an object');
  }

  return {
    externalId,
    title,
    summary: readOptionalString(raw, 'summary', 500),
    description: readOptionalString(raw, 'description') ?? title,
    imageUrl: readOptionalUrl(raw, 'imageUrl'),
    sourceUrl: readOptionalUrl(raw, 'sourceUrl'),
    dates: [
      {
        startsAt,
        endsAt,
        timezone: 'Pacific/Auckland',
        isAllDay: typeof raw.isAllDay === 'boolean' ? raw.isAllDay : false,
      },
    ],
    venue: venue
      ? {
          name: readRequiredString(venue, 'name', 200),
          address: readOptionalString(venue, 'address'),
          suburb: readOptionalString(venue, 'suburb', 120),
        }
      : null,
    tags: [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))],
    costType: costType as ActivityCostType,
    costAmountFrom: readOptionalNumber(raw, 'costAmountFrom'),
    costDetails: readOptionalString(raw, 'costDetails', 255),
    isCancelled: false,
    raw,
  };
}

function readRequiredString(
  record: Record<string, unknown>,
  key: string,
  max = 10_000,
): string {
  const value = readOptionalString(record, key, max);
  if (!value) throw new BadRequestException(`${key} is required`);
  return value;
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string,
  max = 10_000,
): string | null {
  const value = record[key];
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > max) {
    throw new BadRequestException(
      `${key} must be a string no longer than ${max} characters`,
    );
  }
  return value.trim();
}

function readRequiredDate(
  record: Record<string, unknown>,
  key: string,
): string {
  const value = readRequiredString(record, key, 100);
  if (Number.isNaN(Date.parse(value))) {
    throw new BadRequestException(`${key} must be an ISO date-time`);
  }
  return value;
}

function readOptionalDate(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = readOptionalString(record, key, 100);
  if (value && Number.isNaN(Date.parse(value))) {
    throw new BadRequestException(`${key} must be an ISO date-time`);
  }
  return value;
}

function readOptionalUrl(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = readOptionalString(record, key, 2_000);
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new BadRequestException(`${key} must be an HTTP(S) URL`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new BadRequestException(`${key} must be an HTTP(S) URL`);
  }
  return url.toString();
}

function readOptionalNumber(
  record: Record<string, unknown>,
  key: string,
): number | null {
  const value = record[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new BadRequestException(`${key} must be a non-negative number`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
