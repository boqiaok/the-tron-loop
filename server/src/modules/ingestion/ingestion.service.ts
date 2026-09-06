import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { Repository } from 'typeorm';
import { ActivitiesService } from '../activities/activities.service';
import { createSlug } from '../activities/activity-slug';
import { Activity } from '../activities/entities/activity.entity';
import { Tag } from '../activities/entities/tag.entity';
import { Venue } from '../activities/entities/venue.entity';
import { ActivityCostType } from '../activities/enums/activity-cost-type.enum';
import { ActivityStatus } from '../activities/enums/activity-status.enum';
import {
  CreateSourceDto,
  ImportRunResponseDto,
  SourceResponseDto,
  UpdateSourceDto,
} from './dto/source.dto';
import { ImportItem, ImportItemOutcome } from './entities/import-item.entity';
import { ImportRun, ImportRunStatus } from './entities/import-run.entity';
import { Source } from './entities/source.entity';

interface FeedActivity {
  externalId: string;
  title: string;
  summary: string | null;
  description: string;
  imageUrl: string | null;
  sourceUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  isAllDay: boolean;
  venue: { name: string; address: string | null; suburb: string | null } | null;
  tags: string[];
  costType: ActivityCostType;
  costAmountFrom: number | null;
  costDetails: string | null;
  raw: Record<string, unknown>;
}

@Injectable()
export class IngestionService {
  constructor(
    @InjectRepository(Source)
    private readonly sources: Repository<Source>,
    @InjectRepository(ImportRun)
    private readonly runs: Repository<ImportRun>,
    @InjectRepository(ImportItem)
    private readonly items: Repository<ImportItem>,
    @InjectRepository(Activity)
    private readonly activities: Repository<Activity>,
    @InjectRepository(Venue)
    private readonly venues: Repository<Venue>,
    @InjectRepository(Tag)
    private readonly tags: Repository<Tag>,
    private readonly activitiesService: ActivitiesService,
  ) {}

  async createSource(dto: CreateSourceDto): Promise<SourceResponseDto> {
    if (await this.sources.existsBy({ name: dto.name.trim() })) {
      throw new ConflictException('A source with this name already exists');
    }
    const source = await this.sources.save(
      this.sources.create({
        name: dto.name.trim(),
        feedUrl: dto.feedUrl,
        enabled: dto.enabled ?? true,
        scheduleHours: dto.scheduleHours ?? 6,
        lastRunAt: null,
      }),
    );
    return mapSource(source);
  }

  async updateSource(
    id: string,
    dto: UpdateSourceDto,
  ): Promise<SourceResponseDto> {
    const source = await this.getSource(id);
    if (dto.name !== undefined) source.name = dto.name.trim();
    if (dto.feedUrl !== undefined) source.feedUrl = dto.feedUrl;
    if (dto.enabled !== undefined) source.enabled = dto.enabled;
    if (dto.scheduleHours !== undefined)
      source.scheduleHours = dto.scheduleHours;
    try {
      return mapSource(await this.sources.save(source));
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('A source with this name already exists');
      }
      throw error;
    }
  }

  async listSources(): Promise<SourceResponseDto[]> {
    return (await this.sources.find({ order: { name: 'ASC' } })).map(mapSource);
  }

  async listRuns(): Promise<ImportRunResponseDto[]> {
    return (
      await this.runs.find({
        relations: { source: true },
        order: { startedAt: 'DESC' },
        take: 50,
      })
    ).map(mapRun);
  }

  async importSource(sourceId: string): Promise<ImportRunResponseDto> {
    const source = await this.getSource(sourceId);
    if (
      await this.runs.existsBy({
        sourceId,
        status: ImportRunStatus.Running,
      })
    ) {
      throw new ConflictException('This source already has an import running');
    }

    let run = await this.runs.save(
      this.runs.create({
        sourceId,
        status: ImportRunStatus.Running,
        startedAt: new Date(),
        finishedAt: null,
        error: null,
      }),
    );

    try {
      const feed = await this.fetchFeed(source.feedUrl);
      for (const raw of feed) {
        try {
          const item = parseFeedActivity(raw);
          const outcome = await this.importItem(source, run, item);
          incrementOutcome(run, outcome);
        } catch (error) {
          run.failedCount += 1;
          await this.items.save(
            this.items.create({
              runId: run.id,
              sourceId,
              externalId: readOptionalString(raw, 'externalId') ?? 'unknown',
              fingerprint: fingerprint(JSON.stringify(raw)),
              activityId: null,
              outcome: ImportItemOutcome.Failed,
              message: errorMessage(error),
              rawPayload: raw,
            }),
          );
        }
      }
      run.status = ImportRunStatus.Succeeded;
    } catch (error) {
      run.status = ImportRunStatus.Failed;
      run.error = errorMessage(error);
    }

    run.finishedAt = new Date();
    source.lastRunAt = run.finishedAt;
    await this.sources.save(source);
    run = await this.runs.save(run);
    run.source = source;
    return mapRun(run);
  }

  async importDueSources(): Promise<void> {
    const now = Date.now();
    const sources = await this.sources.findBy({ enabled: true });
    for (const source of sources) {
      const dueAt =
        (source.lastRunAt?.getTime() ?? 0) + source.scheduleHours * 3_600_000;
      if (dueAt <= now) await this.importSource(source.id);
    }
  }

  private async importItem(
    source: Source,
    run: ImportRun,
    item: FeedActivity,
  ): Promise<ImportItemOutcome> {
    const itemFingerprint = fingerprint(
      `${normalize(item.title)}|${new Date(item.startsAt).toISOString()}|${normalize(item.venue?.name ?? '')}`,
    );
    const existing = await this.activities.findOneBy({
      sourceId: source.id,
      externalId: item.externalId,
    });

    let activityId: string | null = existing?.id ?? null;
    let outcome: ImportItemOutcome;
    let message: string | null = null;

    if (existing && existing.status !== ActivityStatus.Draft) {
      outcome = ImportItemOutcome.ReviewRequired;
      message = 'The existing imported activity is no longer a draft';
    } else {
      const duplicate = await this.activities.findOneBy({
        importFingerprint: itemFingerprint,
      });
      if (duplicate && duplicate.id !== existing?.id) {
        outcome = ImportItemOutcome.Duplicate;
        activityId = duplicate.id;
        message = 'A matching title, start time and venue already exists';
      } else {
        const venueId = await this.resolveVenue(item.venue);
        const tagIds = await this.resolveTags(item.tags);
        const input = {
          title: item.title,
          summary: item.summary,
          description: item.description,
          imageUrl: item.imageUrl,
          sourceUrl: item.sourceUrl ?? source.feedUrl,
          costType: item.costType,
          costAmountFrom: item.costAmountFrom,
          currency: 'NZD',
          costDetails: item.costDetails,
          venueId,
          tagIds,
          dates: [
            {
              startsAt: item.startsAt,
              endsAt: item.endsAt,
              timezone: 'Pacific/Auckland',
              isAllDay: item.isAllDay,
              recurrenceRule: null,
            },
          ],
        };

        if (existing) {
          await this.activitiesService.update(existing.id, input);
          activityId = existing.id;
          outcome = ImportItemOutcome.Updated;
        } else {
          const externalSlug =
            createSlug(item.externalId).slice(0, 60) || run.id.slice(0, 8);
          const titleSlug = createSlug(item.title).slice(0, 150) || 'activity';
          const created = await this.activitiesService.create({
            ...input,
            slug: `${titleSlug}-${externalSlug}`.slice(0, 220),
          });
          activityId = created.id;
          outcome = ImportItemOutcome.Created;
        }
        await this.activities.update(activityId, {
          sourceId: source.id,
          externalId: item.externalId,
          importFingerprint: itemFingerprint,
        });
      }
    }

    await this.items.save(
      this.items.create({
        runId: run.id,
        sourceId: source.id,
        externalId: item.externalId,
        fingerprint: itemFingerprint,
        activityId,
        outcome,
        message,
        rawPayload: item.raw,
      }),
    );
    return outcome;
  }

  private async resolveVenue(
    venue: FeedActivity['venue'],
  ): Promise<string | null> {
    if (!venue) return null;
    let existing = await this.venues
      .createQueryBuilder('venue')
      .where('LOWER(venue.name) = LOWER(:name)', { name: venue.name })
      .andWhere("COALESCE(LOWER(venue.address), '') = LOWER(:address)", {
        address: venue.address ?? '',
      })
      .getOne();
    if (!existing) {
      existing = await this.venues.save(
        this.venues.create({
          name: venue.name,
          address: venue.address,
          suburb: venue.suburb,
          city: 'Hamilton',
          latitude: null,
          longitude: null,
        }),
      );
    }
    return existing.id;
  }

  private async resolveTags(names: string[]): Promise<string[]> {
    const ids: string[] = [];
    for (const name of names) {
      const slug = createSlug(name);
      if (!slug) continue;
      let tag = await this.tags.findOneBy({ slug });
      if (!tag) tag = await this.tags.save(this.tags.create({ name, slug }));
      ids.push(tag.id);
    }
    return ids;
  }

  private async fetchFeed(url: string): Promise<Record<string, unknown>[]> {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok)
      throw new BadRequestException(`Source returned HTTP ${response.status}`);
    const text = await response.text();
    if (text.length > 2_000_000)
      throw new BadRequestException('Source response exceeds 2 MB');
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
    if (!payload.items.every(isRecord))
      throw new BadRequestException('Every source item must be an object');
    return payload.items;
  }

  private async getSource(id: string): Promise<Source> {
    const source = await this.sources.findOneBy({ id });
    if (!source) throw new NotFoundException('Source not found');
    return source;
  }
}

function parseFeedActivity(raw: Record<string, unknown>): FeedActivity {
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
    startsAt,
    endsAt,
    isAllDay: typeof raw.isAllDay === 'boolean' ? raw.isAllDay : false,
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
  if (Number.isNaN(Date.parse(value)))
    throw new BadRequestException(`${key} must be an ISO date-time`);
  return value;
}

function readOptionalDate(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = readOptionalString(record, key, 100);
  if (value && Number.isNaN(Date.parse(value)))
    throw new BadRequestException(`${key} must be an ISO date-time`);
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
  if (!['http:', 'https:'].includes(url.protocol))
    throw new BadRequestException(`${key} must be an HTTP(S) URL`);
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

function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function incrementOutcome(run: ImportRun, outcome: ImportItemOutcome): void {
  if (outcome === ImportItemOutcome.Created) run.createdCount += 1;
  if (outcome === ImportItemOutcome.Updated) run.updatedCount += 1;
  if (outcome === ImportItemOutcome.Duplicate) run.duplicateCount += 1;
  if (outcome === ImportItemOutcome.ReviewRequired) run.reviewCount += 1;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message.slice(0, 2_000)
    : 'Unknown import error';
}

function mapSource(source: Source): SourceResponseDto {
  return {
    id: source.id,
    name: source.name,
    feedUrl: source.feedUrl,
    enabled: source.enabled,
    scheduleHours: source.scheduleHours,
    lastRunAt: source.lastRunAt?.toISOString() ?? null,
  };
}

function mapRun(run: ImportRun): ImportRunResponseDto {
  return {
    id: run.id,
    sourceId: run.sourceId,
    sourceName: run.source.name,
    status: run.status,
    createdCount: run.createdCount,
    updatedCount: run.updatedCount,
    duplicateCount: run.duplicateCount,
    reviewCount: run.reviewCount,
    failedCount: run.failedCount,
    error: run.error,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
  };
}
