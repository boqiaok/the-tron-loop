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
import { ActivityStatus } from '../activities/enums/activity-status.enum';
import { ActivityCategory } from '../activities/enums/activity-category.enum';
import { ActivityEnvironment } from '../activities/enums/activity-environment.enum';
import { inferActivityScheduling } from '../activities/activity-duration';
import {
  CreateSourceDto,
  ImportRunResponseDto,
  SourceResponseDto,
  UpdateSourceDto,
} from './dto/source.dto';
import { ImportItem, ImportItemOutcome } from './entities/import-item.entity';
import { ImportRun, ImportRunStatus } from './entities/import-run.entity';
import { Source } from './entities/source.entity';
import { isSameTitle, isSameVenue } from './activity-match';
import { EventfindaAdapter } from './eventfinda.adapter';
import { HamiltonLibrariesAdapter } from './hamilton-libraries.adapter';
import { JsonFeedAdapter } from './json-feed.adapter';
import { ImportedActivity, SourceAdapter } from './source-adapter';
import { SourceType } from './source-type.enum';

@Injectable()
export class IngestionService {
  private readonly adapters: Record<SourceType, SourceAdapter>;

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
    jsonFeedAdapter: JsonFeedAdapter,
    eventfindaAdapter: EventfindaAdapter,
    hamiltonLibrariesAdapter: HamiltonLibrariesAdapter,
  ) {
    this.adapters = {
      [SourceType.JsonFeed]: jsonFeedAdapter,
      [SourceType.Eventfinda]: eventfindaAdapter,
      [SourceType.HamiltonLibraries]: hamiltonLibrariesAdapter,
    };
  }

  async createSource(dto: CreateSourceDto): Promise<SourceResponseDto> {
    if (await this.sources.existsBy({ name: dto.name.trim() })) {
      throw new ConflictException('A source with this name already exists');
    }
    const source = await this.sources.save(
      this.sources.create({
        name: dto.name.trim(),
        sourceType: dto.sourceType,
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
    if (dto.sourceType !== undefined) source.sourceType = dto.sourceType;
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
      const adapter = this.adapters[source.sourceType];
      const feed = await adapter.fetch(source);
      for (const raw of feed) {
        try {
          const item = adapter.parse(raw);
          const outcome = await this.importItem(source, run, item);
          incrementOutcome(run, outcome);
        } catch (error) {
          run.failedCount += 1;
          await this.items.save(
            this.items.create({
              runId: run.id,
              sourceId,
              externalId: readExternalId(raw),
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
    item: ImportedActivity,
  ): Promise<ImportItemOutcome> {
    const firstDate = item.dates[0];
    if (!firstDate && !item.isCancelled) {
      throw new BadRequestException('An imported activity requires a date');
    }
    const itemFingerprint = fingerprint(
      `${normalize(item.title)}|${firstDate?.startsAt ?? 'cancelled'}|${normalize(item.venue?.name ?? '')}`,
    );
    const existing = await this.activities.findOneBy({
      sourceId: source.id,
      externalId: item.externalId,
    });

    let activityId: string | null = existing?.id ?? null;
    let outcome: ImportItemOutcome;
    let message: string | null = null;

    if (item.isCancelled) {
      outcome = ImportItemOutcome.ReviewRequired;
      message = 'The source marks this activity as cancelled';
    } else if (existing && existing.status !== ActivityStatus.Draft) {
      outcome = ImportItemOutcome.ReviewRequired;
      message = 'The existing imported activity is no longer a draft';
    } else {
      const duplicate = await this.findDuplicate(
        source,
        item,
        itemFingerprint,
        existing?.id ?? null,
      );
      if (!existing && duplicate) {
        outcome = ImportItemOutcome.Duplicate;
        activityId = duplicate.id;
        message = `Matches existing activity "${duplicate.title}" (same title, start time and venue)`;
      } else {
        const venueId = await this.resolveVenue(item.venue);
        const tagIds = await this.resolveTags(item.tags);
        const inferredScheduling = inferActivityScheduling(item);
        const input = {
          title: item.title,
          summary: item.summary,
          description: item.description,
          imageUrl: item.imageUrl,
          category: item.category ?? ActivityCategory.Community,
          environment: item.environment ?? ActivityEnvironment.Unknown,
          scheduleMode: item.scheduleMode ?? inferredScheduling.scheduleMode,
          visitMinutes:
            item.visitMinutes === undefined
              ? inferredScheduling.visitMinutes
              : item.visitMinutes,
          durationSource:
            item.durationSource ?? inferredScheduling.durationSource,
          sourceUrl: item.sourceUrl ?? source.feedUrl,
          costType: item.costType,
          costAmountFrom: item.costAmountFrom,
          currency: 'NZD',
          costDetails: item.costDetails,
          venueId,
          tagIds,
          dates: item.dates.map((date) => ({
            ...date,
            recurrenceRule: null,
          })),
        };

        if (existing) {
          await this.activitiesService.update(existing.id, input);
          activityId = existing.id;
          if (duplicate) {
            outcome = ImportItemOutcome.ReviewRequired;
            message =
              'This existing imported activity matches another activity';
          } else {
            outcome = ImportItemOutcome.Updated;
          }
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
    venue: ImportedActivity['venue'],
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
          latitude: venue.latitude ?? null,
          longitude: venue.longitude ?? null,
        }),
      );
    } else if (
      (existing.latitude === null && venue.latitude != null) ||
      (existing.longitude === null && venue.longitude != null)
    ) {
      existing.latitude ??= venue.latitude ?? null;
      existing.longitude ??= venue.longitude ?? null;
      existing = await this.venues.save(existing);
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

  private async getSource(id: string): Promise<Source> {
    const source = await this.sources.findOneBy({ id });
    if (!source) throw new NotFoundException('Source not found');
    return source;
  }

  /**
   * Finds an activity already describing this listing: first by the exact
   * import fingerprint, then across other sources by a shared start time with
   * the same title and a compatible venue (sources name venues differently).
   */
  private async findDuplicate(
    source: Source,
    item: ImportedActivity,
    itemFingerprint: string,
    existingId: string | null,
  ): Promise<Activity | null> {
    const exact = await this.activities.findOneBy({
      importFingerprint: itemFingerprint,
    });
    if (exact && exact.id !== existingId) return exact;
    if (!item.dates.length) return null;

    const query = this.activities
      .createQueryBuilder('activity')
      .innerJoin('activity.dates', 'date')
      .leftJoinAndSelect('activity.venue', 'venue')
      .where('date.startsAt IN (:...startsAt)', {
        startsAt: item.dates.map((date) => new Date(date.startsAt)),
      })
      .andWhere('activity.sourceId IS DISTINCT FROM :sourceId', {
        sourceId: source.id,
      });
    if (existingId) {
      query.andWhere('activity.id <> :existingId', { existingId });
    }
    const candidates = await query.take(50).getMany();
    return (
      candidates.find(
        (candidate) =>
          isSameTitle(candidate.title, item.title) &&
          isSameVenue(candidate.venue, item.venue),
      ) ?? null
    );
  }
}

function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function readExternalId(raw: Record<string, unknown>): string {
  const value = raw.externalId ?? raw.id;
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).slice(0, 255);
  }
  return 'unknown';
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
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
    sourceType: source.sourceType,
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
