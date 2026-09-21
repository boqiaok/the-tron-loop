import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  In,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { createSlug } from './activity-slug';
import { toActivityResponse } from './activity.mapper';
import { isPostgresUniqueViolation } from './database-error';
import { ActivityDateInputDto } from './dto/activity-date-input.dto';
import { ActivityFilterOptionsResponseDto } from './dto/activity-filter-options-response.dto';
import {
  ActivityResponseDto,
  PaginatedActivitiesResponseDto,
} from './dto/activity-response.dto';
import {
  ActivityPaginationQueryDto,
  ActivityRangeQueryDto,
  AdminActivityQueryDto,
} from './dto/activity-query.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ActivityDate } from './entities/activity-date.entity';
import { ActivityTag } from './entities/activity-tag.entity';
import { Activity } from './entities/activity.entity';
import { Tag } from './entities/tag.entity';
import { Venue } from './entities/venue.entity';
import { ActivityCategory } from './enums/activity-category.enum';
import { ActivityCostType } from './enums/activity-cost-type.enum';
import { ActivityEnvironment } from './enums/activity-environment.enum';
import { ActivityScheduleMode } from './enums/activity-schedule-mode.enum';
import { DurationSource } from './enums/duration-source.enum';
import { ActivityStatus } from './enums/activity-status.enum';

const ACTIVITY_RELATIONS = {
  venue: true,
  dates: true,
  activityTags: { tag: true },
} as const;
const MAX_PUBLIC_RANGE_MS = 169 * 60 * 60 * 1000;
const ACTIVITY_TIME_ZONE = 'Pacific/Auckland';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Activity)
    private readonly activitiesRepository: Repository<Activity>,
  ) {}

  async create(dto: CreateActivityDto): Promise<ActivityResponseDto> {
    this.validateScheduling(dto);
    const slug = this.buildSlug(dto.slug ?? dto.title);
    const dates = this.prepareDates(dto.dates);

    try {
      const activityId = await this.dataSource.transaction(async (manager) => {
        await this.validateReferences(manager, dto.venueId, dto.tagIds);

        const activitiesRepository = manager.getRepository(Activity);
        const activity = activitiesRepository.create({
          title: dto.title.trim(),
          slug,
          summary: dto.summary?.trim() || null,
          description: dto.description.trim(),
          imageUrl: dto.imageUrl ?? null,
          category: dto.category ?? ActivityCategory.Community,
          environment: dto.environment ?? ActivityEnvironment.Unknown,
          scheduleMode: dto.scheduleMode ?? ActivityScheduleMode.Fixed,
          visitMinutes: dto.visitMinutes ?? null,
          durationSource: dto.durationSource ?? DurationSource.Source,
          costType: dto.costType ?? ActivityCostType.Unknown,
          costAmountFrom: this.toDatabaseAmount(dto.costAmountFrom),
          currency: dto.currency ?? 'NZD',
          costDetails: dto.costDetails?.trim() || null,
          venueId: dto.venueId ?? null,
          sourceUrl: dto.sourceUrl ?? null,
          status: ActivityStatus.Draft,
          publishedAt: null,
          cancelledAt: null,
        });
        const savedActivity = await activitiesRepository.save(activity);

        await this.replaceDates(manager, savedActivity.id, dates);
        await this.replaceTags(manager, savedActivity.id, dto.tagIds ?? []);

        return savedActivity.id;
      });

      return this.findAdminById(activityId);
    } catch (error) {
      this.throwSlugConflict(error, slug);
      throw error;
    }
  }

  async findAdminPage(
    query: AdminActivityQueryDto,
  ): Promise<PaginatedActivitiesResponseDto> {
    const where: FindOptionsWhere<Activity> = {};

    if (query.status) {
      where.status = query.status;
    }

    return this.findPage(query.page, query.limit, where);
  }

  async findPublicPage(
    query: ActivityPaginationQueryDto,
  ): Promise<PaginatedActivitiesResponseDto> {
    const { from, to } = this.parsePublicRange(query);
    if (
      query.sortBy === 'distance' &&
      (query.latitude === undefined || query.longitude === undefined)
    ) {
      throw new BadRequestException(
        'Distance sorting requires latitude and longitude',
      );
    }

    const baseQuery = this.createPublicQuery(query, from, to);
    const countResult = await baseQuery
      .clone()
      .select('COUNT(DISTINCT activity.id)', 'total')
      .getRawOne<{ total: string }>();
    const total = Number(countResult?.total ?? 0);
    let idQuery = baseQuery
      .select('activity.id', 'activityId')
      .addSelect('MIN(matchingDate.startsAt)', 'firstMatchingStart')
      .groupBy('activity.id');
    const hasLocation =
      query.latitude !== undefined && query.longitude !== undefined;
    const expression = `CASE WHEN sortVenue.latitude IS NULL OR sortVenue.longitude IS NULL THEN NULL ELSE 6371 * acos(LEAST(1, cos(radians(:latitude)) * cos(radians(sortVenue.latitude)) * cos(radians(sortVenue.longitude) - radians(:longitude)) + sin(radians(:latitude)) * sin(radians(sortVenue.latitude)))) END`;
    if (hasLocation) {
      idQuery = idQuery
        .addSelect(expression, 'distanceKm')
        .addGroupBy('sortVenue.latitude')
        .addGroupBy('sortVenue.longitude')
        .setParameters({
          latitude: query.latitude,
          longitude: query.longitude,
        });
    }
    if (query.sortBy === 'distance') {
      idQuery = idQuery
        .orderBy(
          'CASE WHEN sortVenue.latitude IS NULL OR sortVenue.longitude IS NULL THEN 1 ELSE 0 END',
          'ASC',
        )
        .addOrderBy(expression, 'ASC')
        .addOrderBy('MIN(matchingDate.startsAt)', 'ASC');
    } else {
      idQuery = idQuery.orderBy(
        'MIN(matchingDate.startsAt)',
        query.sort === 'desc' ? 'DESC' : 'ASC',
      );
    }
    const idRows = await idQuery
      .addOrderBy('activity.id', 'ASC')
      .offset((query.page - 1) * query.limit)
      .limit(query.limit)
      .getRawMany<{ activityId: string; distanceKm?: string | null }>();
    const activityIds = idRows.map((row) => row.activityId);

    if (activityIds.length === 0) {
      return {
        items: [],
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      };
    }

    const activities = await this.activitiesRepository.find({
      where: { id: In(activityIds) },
      relations: ACTIVITY_RELATIONS,
    });
    const activityById = new Map(
      activities.map((activity) => [activity.id, activity]),
    );

    return {
      items: activityIds
        .map((id) => activityById.get(id))
        .filter((activity): activity is Activity => activity !== undefined)
        .map((activity) => {
          const response = toActivityResponse(activity, { from, to });
          const distance = idRows.find(
            ({ activityId }) => activityId === activity.id,
          )?.distanceKm;
          return {
            ...response,
            distanceKm:
              distance == null
                ? undefined
                : Math.round(Number(distance) * 10) / 10,
          };
        }),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findPublicFilterOptions(
    query: ActivityRangeQueryDto,
  ): Promise<ActivityFilterOptionsResponseDto> {
    const { from, to } = this.parsePublicRange(query);
    const inRange = () =>
      this.activitiesRepository
        .createQueryBuilder('activity')
        .innerJoin(
          'activity.dates',
          'matchingDate',
          'matchingDate.startsAt >= :from AND matchingDate.startsAt < :to',
          { from, to },
        );
    const [categoryRows, suburbs, cancelled] = await Promise.all([
      inRange()
        .where('activity.status = :published', {
          published: ActivityStatus.Published,
        })
        .select('activity.category', 'category')
        .addSelect('COUNT(DISTINCT activity.id)', 'count')
        .groupBy('activity.category')
        .getRawMany<{ category: ActivityCategory; count: string }>(),
      inRange()
        .innerJoin('activity.venue', 'venue')
        .where('activity.status = :published', {
          published: ActivityStatus.Published,
        })
        .andWhere('venue.suburb IS NOT NULL')
        .select('venue.suburb', 'suburb')
        .distinct(true)
        .orderBy('venue.suburb', 'ASC')
        .getRawMany<{ suburb: string }>(),
      inRange()
        .where('activity.status = :cancelled', {
          cancelled: ActivityStatus.Cancelled,
        })
        .select('COUNT(DISTINCT activity.id)', 'count')
        .getRawOne<{ count: string }>(),
    ]);
    const counts = new Map(
      categoryRows.map(({ category, count }) => [category, Number(count)]),
    );

    return {
      categories: Object.values(ActivityCategory).map((category) => ({
        category,
        count: counts.get(category) ?? 0,
      })),
      suburbs: suburbs.map(({ suburb }) => suburb),
      cancelledCount: Number(cancelled?.count ?? 0),
    };
  }

  async findRegularActivities(): Promise<ActivityResponseDto[]> {
    const activities = await this.activitiesRepository
      .createQueryBuilder('activity')
      .innerJoin('activity.dates', 'recurringDate')
      .where('activity.status = :status', { status: ActivityStatus.Published })
      .andWhere('recurringDate.recurrenceRule IS NOT NULL')
      .select('activity.id', 'id')
      .distinct(true)
      .getRawMany<{ id: string }>();
    const ids = activities.map(({ id }) => id);
    if (!ids.length) return [];

    const records = await this.activitiesRepository.find({
      where: { id: In(ids) },
      relations: ACTIVITY_RELATIONS,
      order: { title: 'ASC' },
    });
    return records.map((activity) => ({
      ...toActivityResponse(activity),
      dates: toActivityResponse(activity).dates.filter(
        (date) => date.recurrenceRule !== null,
      ),
    }));
  }

  async findPublicBySlug(slug: string): Promise<ActivityResponseDto> {
    const activity = await this.activitiesRepository.findOne({
      where: {
        slug,
        status: In([ActivityStatus.Published, ActivityStatus.Cancelled]),
      },
      relations: ACTIVITY_RELATIONS,
    });

    if (!activity) {
      throw new NotFoundException(`Activity "${slug}" was not found`);
    }

    return toActivityResponse(activity);
  }

  async findAdminById(id: string): Promise<ActivityResponseDto> {
    const activity = await this.activitiesRepository.findOne({
      where: { id },
      relations: ACTIVITY_RELATIONS,
    });

    if (!activity) {
      throw new NotFoundException(`Activity "${id}" was not found`);
    }

    return toActivityResponse(activity);
  }

  async update(
    id: string,
    dto: UpdateActivityDto,
  ): Promise<ActivityResponseDto> {
    this.validateScheduling(dto);
    const dates = dto.dates ? this.prepareDates(dto.dates) : undefined;
    const slug = dto.slug ? this.buildSlug(dto.slug) : undefined;

    try {
      await this.dataSource.transaction(async (manager) => {
        const activitiesRepository = manager.getRepository(Activity);
        const activity = await activitiesRepository.findOneBy({ id });

        if (!activity) {
          throw new NotFoundException(`Activity "${id}" was not found`);
        }

        if (activity.status === ActivityStatus.Cancelled) {
          throw new ConflictException('Cancelled activities cannot be edited');
        }

        await this.validateReferences(manager, dto.venueId, dto.tagIds);
        this.applyUpdates(activity, dto, slug);
        if (
          activity.scheduleMode === ActivityScheduleMode.Window &&
          activity.visitMinutes == null
        ) {
          throw new BadRequestException(
            'Window activities require a recommended visit duration',
          );
        }
        await activitiesRepository.save(activity);

        if (dates) {
          await this.replaceDates(manager, id, dates);
        }

        if (dto.tagIds) {
          await this.replaceTags(manager, id, dto.tagIds);
        }
      });

      return this.findAdminById(id);
    } catch (error) {
      this.throwSlugConflict(error, slug);
      throw error;
    }
  }

  async publish(id: string): Promise<ActivityResponseDto> {
    await this.dataSource.transaction(async (manager) => {
      const activitiesRepository = manager.getRepository(Activity);
      const activity = await activitiesRepository.findOneBy({ id });

      if (!activity) {
        throw new NotFoundException(`Activity "${id}" was not found`);
      }

      if (activity.status !== ActivityStatus.Draft) {
        throw new ConflictException('Only draft activities can be published');
      }

      const dateCount = await manager.getRepository(ActivityDate).countBy({
        activityId: id,
      });

      if (dateCount === 0) {
        throw new ConflictException(
          'An activity must have at least one date before it can be published',
        );
      }

      activity.status = ActivityStatus.Published;
      activity.publishedAt = new Date();
      await activitiesRepository.save(activity);
    });

    return this.findAdminById(id);
  }

  async cancel(id: string): Promise<ActivityResponseDto> {
    await this.dataSource.transaction(async (manager) => {
      const activitiesRepository = manager.getRepository(Activity);
      const activity = await activitiesRepository.findOneBy({ id });

      if (!activity) {
        throw new NotFoundException(`Activity "${id}" was not found`);
      }

      if (activity.status !== ActivityStatus.Published) {
        throw new ConflictException(
          'Only published activities can be cancelled',
        );
      }

      activity.status = ActivityStatus.Cancelled;
      activity.cancelledAt = new Date();
      await activitiesRepository.save(activity);
    });

    return this.findAdminById(id);
  }

  async removeDraft(id: string): Promise<void> {
    const activity = await this.activitiesRepository.findOneBy({ id });

    if (!activity) {
      throw new NotFoundException(`Activity "${id}" was not found`);
    }

    if (activity.status !== ActivityStatus.Draft) {
      throw new ConflictException('Only draft activities can be deleted');
    }

    await this.activitiesRepository.remove(activity);
  }

  private async findPage(
    page: number,
    limit: number,
    where: FindOptionsWhere<Activity>,
  ): Promise<PaginatedActivitiesResponseDto> {
    const [activities, total] = await this.activitiesRepository.findAndCount({
      where,
      relations: ACTIVITY_RELATIONS,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: activities.map((activity) => toActivityResponse(activity)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  private createPublicQuery(
    query: ActivityPaginationQueryDto,
    from: Date,
    to: Date,
  ): SelectQueryBuilder<Activity> {
    const queryBuilder = this.activitiesRepository
      .createQueryBuilder('activity')
      .innerJoin('activity.dates', 'matchingDate')
      .where('activity.status IN (:...publicStatuses)', {
        publicStatuses: query.includeCancelled
          ? [ActivityStatus.Published, ActivityStatus.Cancelled]
          : [ActivityStatus.Published],
      });

    if (query.latitude !== undefined && query.longitude !== undefined) {
      queryBuilder.leftJoin('activity.venue', 'sortVenue');
    }

    queryBuilder
      .andWhere('matchingDate.startsAt >= :from', { from })
      .andWhere('matchingDate.startsAt < :to', { to });

    if (query.evening) {
      queryBuilder.andWhere(
        `EXTRACT(HOUR FROM matchingDate.startsAt AT TIME ZONE :timeZone) >= 17`,
        { timeZone: ACTIVITY_TIME_ZONE },
      );
    }

    if (query.categories?.length) {
      queryBuilder.andWhere('activity.category IN (:...categories)', {
        categories: query.categories,
      });
    }

    if (query.q) {
      queryBuilder.andWhere(
        `(activity.title ILIKE :search
          OR activity.summary ILIKE :search
          OR activity.description ILIKE :search
          OR EXISTS (
            SELECT 1 FROM "activity_tags" "searchActivityTag"
            INNER JOIN "tags" "searchTag" ON "searchTag"."id" = "searchActivityTag"."tag_id"
            WHERE "searchActivityTag"."activity_id" = activity.id
              AND "searchTag"."name" ILIKE :search
          )
          OR EXISTS (
            SELECT 1 FROM "venues" "searchVenue"
            WHERE "searchVenue"."id" = "activity"."venue_id"
              AND ("searchVenue"."name" ILIKE :search
                OR "searchVenue"."suburb" ILIKE :search)
          ))`,
        { search: `%${query.q}%` },
      );
    }

    if (query.costType) {
      queryBuilder.andWhere('activity.costType = :costType', {
        costType: query.costType,
      });
    }

    if (query.suburb) {
      queryBuilder.innerJoin(
        'activity.venue',
        'filterVenue',
        'LOWER(filterVenue.suburb) = LOWER(:suburb)',
        { suburb: query.suburb },
      );
    }

    return queryBuilder;
  }

  private parsePublicRange(query: ActivityRangeQueryDto): {
    from: Date;
    to: Date;
  } {
    const from = new Date(query.from);
    const to = new Date(query.to);

    if (from >= to) {
      throw new BadRequestException('"from" must be earlier than "to"');
    }

    if (to.getTime() - from.getTime() > MAX_PUBLIC_RANGE_MS) {
      throw new BadRequestException(
        'Public activity queries cannot exceed one calendar week',
      );
    }

    return { from, to };
  }

  private buildSlug(value: string): string {
    const slug = createSlug(value);

    if (!slug) {
      throw new BadRequestException('Title must produce a non-empty slug');
    }

    if (slug.length > 220) {
      throw new BadRequestException('Slug must not exceed 220 characters');
    }

    return slug;
  }

  private validateScheduling(dto: Partial<CreateActivityDto>): void {
    if (
      dto.scheduleMode === ActivityScheduleMode.Window &&
      dto.visitMinutes == null
    ) {
      throw new BadRequestException(
        'Window activities require a recommended visit duration',
      );
    }
  }

  private prepareDates(
    inputs: ActivityDateInputDto[],
  ): Array<
    Pick<
      ActivityDate,
      'startsAt' | 'endsAt' | 'timezone' | 'isAllDay' | 'recurrenceRule'
    >
  > {
    const dates = inputs.map((input) => ({
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      timezone: input.timezone ?? 'Pacific/Auckland',
      isAllDay: input.isAllDay ?? false,
      recurrenceRule: input.recurrenceRule?.trim() || null,
    }));
    const startsAtValues = dates.map((date) => date.startsAt.getTime());

    if (new Set(startsAtValues).size !== startsAtValues.length) {
      throw new BadRequestException(
        'Activity dates cannot contain duplicate start times',
      );
    }

    for (const date of dates) {
      if (date.endsAt && date.endsAt <= date.startsAt) {
        throw new BadRequestException(
          'Activity date end time must be later than its start time',
        );
      }
      if (date.recurrenceRule) {
        this.validateRecurrenceRule(date.recurrenceRule);
      }
    }

    return dates;
  }

  private validateRecurrenceRule(rule: string): void {
    const fields = new Map<string, string>();
    for (const part of rule.split(';')) {
      const [key, value, ...extra] = part.split('=');
      if (!key || !value || extra.length || fields.has(key)) {
        throw new BadRequestException('Recurrence rule is not valid');
      }
      fields.set(key.toUpperCase(), value.toUpperCase());
    }
    const allowed = new Set([
      'FREQ',
      'INTERVAL',
      'BYDAY',
      'UNTIL',
      'COUNT',
      'EXDATE',
    ]);
    if ([...fields.keys()].some((key) => !allowed.has(key))) {
      throw new BadRequestException(
        'Recurrence rule contains an unsupported field',
      );
    }
    if (fields.get('FREQ') !== 'WEEKLY') {
      throw new BadRequestException('Only weekly recurrence is supported');
    }
    if (
      fields.has('INTERVAL') &&
      !['1', '2'].includes(fields.get('INTERVAL')!)
    ) {
      throw new BadRequestException('Recurrence interval must be 1 or 2 weeks');
    }
    if (
      fields.has('BYDAY') &&
      !/^(MO|TU|WE|TH|FR|SA|SU)(,(MO|TU|WE|TH|FR|SA|SU))*$/.test(
        fields.get('BYDAY')!,
      )
    ) {
      throw new BadRequestException('Recurrence weekdays are not valid');
    }
    if (
      fields.has('UNTIL') &&
      !/^\d{8}(T\d{6}Z)?$/.test(fields.get('UNTIL')!)
    ) {
      throw new BadRequestException(
        'Recurrence UNTIL must use YYYYMMDD or UTC date-time',
      );
    }
    if (fields.has('COUNT') && !/^[1-9]\d{0,2}$/.test(fields.get('COUNT')!)) {
      throw new BadRequestException(
        'Recurrence COUNT must be between 1 and 999',
      );
    }
    if (
      fields.has('EXDATE') &&
      !/^\d{8}(,\d{8})*$/.test(fields.get('EXDATE')!)
    ) {
      throw new BadRequestException(
        'Recurrence EXDATE must contain YYYYMMDD dates',
      );
    }
  }

  private async validateReferences(
    manager: EntityManager,
    venueId: string | null | undefined,
    tagIds: string[] | undefined,
  ): Promise<void> {
    if (venueId) {
      const venueExists = await manager.getRepository(Venue).existsBy({
        id: venueId,
      });

      if (!venueExists) {
        throw new BadRequestException(`Venue "${venueId}" does not exist`);
      }
    }

    if (tagIds?.length) {
      const tags = await manager.getRepository(Tag).findBy({
        id: In(tagIds),
      });

      if (tags.length !== tagIds.length) {
        const existingIds = new Set(tags.map((tag) => tag.id));
        const missingIds = tagIds.filter((tagId) => !existingIds.has(tagId));
        throw new BadRequestException(
          `Tags do not exist: ${missingIds.join(', ')}`,
        );
      }
    }
  }

  private async replaceDates(
    manager: EntityManager,
    activityId: string,
    dates: Array<
      Pick<
        ActivityDate,
        'startsAt' | 'endsAt' | 'timezone' | 'isAllDay' | 'recurrenceRule'
      >
    >,
  ): Promise<void> {
    const repository = manager.getRepository(ActivityDate);
    await repository.delete({ activityId });
    await repository.save(
      dates.map((date) => repository.create({ ...date, activityId })),
    );
  }

  private async replaceTags(
    manager: EntityManager,
    activityId: string,
    tagIds: string[],
  ): Promise<void> {
    const repository = manager.getRepository(ActivityTag);
    await repository.delete({ activityId });

    if (tagIds.length) {
      await repository.save(
        tagIds.map((tagId) => repository.create({ activityId, tagId })),
      );
    }
  }

  private applyUpdates(
    activity: Activity,
    dto: UpdateActivityDto,
    slug: string | undefined,
  ): void {
    if (dto.title !== undefined) activity.title = dto.title.trim();
    if (slug !== undefined) activity.slug = slug;
    if (dto.summary !== undefined)
      activity.summary = dto.summary?.trim() || null;
    if (dto.description !== undefined)
      activity.description = dto.description.trim();
    if (dto.imageUrl !== undefined) activity.imageUrl = dto.imageUrl;
    if (dto.category !== undefined) activity.category = dto.category;
    if (dto.environment !== undefined) activity.environment = dto.environment;
    if (dto.scheduleMode !== undefined)
      activity.scheduleMode = dto.scheduleMode;
    if (dto.visitMinutes !== undefined)
      activity.visitMinutes = dto.visitMinutes;
    if (dto.durationSource !== undefined)
      activity.durationSource = dto.durationSource;
    if (dto.costType !== undefined) activity.costType = dto.costType;
    if (dto.costAmountFrom !== undefined)
      activity.costAmountFrom = this.toDatabaseAmount(dto.costAmountFrom);
    if (dto.currency !== undefined) activity.currency = dto.currency;
    if (dto.costDetails !== undefined)
      activity.costDetails = dto.costDetails?.trim() || null;
    if (dto.venueId !== undefined) activity.venueId = dto.venueId;
    if (dto.sourceUrl !== undefined) activity.sourceUrl = dto.sourceUrl;
  }

  private toDatabaseAmount(value: number | null | undefined): string | null {
    return value === null || value === undefined ? null : value.toFixed(2);
  }

  private throwSlugConflict(error: unknown, slug: string | undefined): void {
    if (slug && isPostgresUniqueViolation(error)) {
      throw new ConflictException(`Activity slug "${slug}" already exists`);
    }
  }
}
