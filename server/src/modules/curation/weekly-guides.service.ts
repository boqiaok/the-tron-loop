import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { toActivityResponse } from '../activities/activity.mapper';
import { Activity } from '../activities/entities/activity.entity';
import { ActivityStatus } from '../activities/enums/activity-status.enum';
import { NO_SOURCE_SIGNALS } from '../ingestion/source-signals';
import {
  assessActivity,
  findRepeatedFormats,
  formatKey,
  QualityExclusion,
  suggestPicks,
} from './activity-quality';
import { SaveWeeklyGuideDto } from './dto/save-weekly-guide.dto';
import {
  AdminWeeklyGuideResponseDto,
  GuideCandidateResponseDto,
  WeeklyGuideResponseDto,
} from './dto/weekly-guide-response.dto';
import { WeeklyGuideItem } from './entities/weekly-guide-item.entity';
import { WeeklyGuide } from './entities/weekly-guide.entity';
import { WeeklyGuideStatus } from './enums/weekly-guide-status.enum';
import { GuideWeek, parseGuideWeek } from './guide-week';
import { SourceSignalsService } from './source-signals.service';

const ACTIVITY_RELATIONS = {
  venue: true,
  dates: true,
  activityTags: { tag: true },
} as const;
const SUGGESTED_PICKS = 7;
const PUBLIC_STATUSES = [ActivityStatus.Published, ActivityStatus.Cancelled];

@Injectable()
export class WeeklyGuidesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(WeeklyGuide)
    private readonly guides: Repository<WeeklyGuide>,
    @InjectRepository(Activity)
    private readonly activities: Repository<Activity>,
    private readonly sourceSignals: SourceSignalsService,
  ) {}

  async findPublished(weekStart: string): Promise<WeeklyGuideResponseDto> {
    const week = parseGuideWeek(weekStart);
    const guide = await this.findGuide(weekStart);
    if (guide?.status !== WeeklyGuideStatus.Published) {
      throw new NotFoundException(`No guide is published for ${weekStart}`);
    }
    return toGuideResponse(guide, week, (activity) =>
      PUBLIC_STATUSES.includes(activity.status),
    );
  }

  async findForEditing(
    weekStart: string,
  ): Promise<AdminWeeklyGuideResponseDto> {
    const week = parseGuideWeek(weekStart);
    const [guide, candidates] = await Promise.all([
      this.findGuide(weekStart),
      this.findCandidates(week),
    ]);
    return {
      weekStart,
      guide: guide ? toGuideResponse(guide, week) : null,
      candidates,
    };
  }

  async save(
    weekStart: string,
    dto: SaveWeeklyGuideDto,
  ): Promise<WeeklyGuideResponseDto> {
    const week = parseGuideWeek(weekStart);
    const activityIds = dto.items.map((item) => item.activityId);
    if (new Set(activityIds).size !== activityIds.length) {
      throw new BadRequestException('An activity can only be picked once');
    }

    await this.dataSource.transaction(async (manager) => {
      const guides = manager.getRepository(WeeklyGuide);
      const guide =
        (await guides.findOneBy({ weekStart })) ??
        guides.create({
          weekStart,
          status: WeeklyGuideStatus.Draft,
          publishedAt: null,
        });
      const activities = await manager.getRepository(Activity).find({
        where: { id: In(activityIds) },
        relations: { dates: true },
      });
      validatePicks(activityIds, activities, week, guide.status);

      guide.intro = dto.intro?.trim() || null;
      const saved = await guides.save(guide);
      const items = manager.getRepository(WeeklyGuideItem);
      await items.delete({ guideId: saved.id });
      await items.save(
        dto.items.map((item, index) =>
          items.create({
            guideId: saved.id,
            activityId: item.activityId,
            position: index + 1,
            note: item.note?.trim() || null,
          }),
        ),
      );
    });

    return this.findGuideResponse(week);
  }

  async publish(weekStart: string): Promise<WeeklyGuideResponseDto> {
    const week = parseGuideWeek(weekStart);
    await this.dataSource.transaction(async (manager) => {
      const guides = manager.getRepository(WeeklyGuide);
      const guide = await guides.findOne({
        where: { weekStart },
        relations: { items: { activity: { dates: true } } },
      });
      if (!guide) {
        throw new NotFoundException(`No guide exists for ${weekStart}`);
      }
      if (guide.status === WeeklyGuideStatus.Published) {
        throw new ConflictException('This guide is already published');
      }
      if (!guide.items.length) {
        throw new ConflictException('Add at least one pick before publishing');
      }
      validatePicks(
        guide.items.map((item) => item.activityId),
        guide.items.map((item) => item.activity),
        week,
        WeeklyGuideStatus.Published,
      );
      await guides.update(guide.id, {
        status: WeeklyGuideStatus.Published,
        publishedAt: new Date(),
      });
    });

    return this.findGuideResponse(week);
  }

  private async findGuideResponse(
    week: GuideWeek,
  ): Promise<WeeklyGuideResponseDto> {
    const guide = await this.findGuide(week.weekStart);
    if (!guide) {
      throw new NotFoundException(`No guide exists for ${week.weekStart}`);
    }
    return toGuideResponse(guide, week);
  }

  private findGuide(weekStart: string): Promise<WeeklyGuide | null> {
    return this.guides.findOne({
      where: { weekStart },
      relations: { items: { activity: ACTIVITY_RELATIONS } },
    });
  }

  /**
   * Every draft or published activity with a session this week, scored and
   * ordered best first, with the automatic suggestion marked.
   */
  private async findCandidates(
    week: GuideWeek,
  ): Promise<GuideCandidateResponseDto[]> {
    const rows = await this.activities
      .createQueryBuilder('activity')
      .innerJoin('activity.dates', 'weekDate')
      .where('activity.status IN (:...statuses)', {
        statuses: [ActivityStatus.Draft, ActivityStatus.Published],
      })
      .andWhere('weekDate.startsAt >= :from AND weekDate.startsAt < :to', {
        from: week.from,
        to: week.to,
      })
      .select('activity.id', 'id')
      .distinct(true)
      .getRawMany<{ id: string }>();
    if (!rows.length) return [];

    const ids = rows.map(({ id }) => id);
    const [activities, signals] = await Promise.all([
      this.activities.find({
        where: { id: In(ids) },
        relations: ACTIVITY_RELATIONS,
      }),
      this.sourceSignals.findForActivities(ids),
    ]);
    const repeated = findRepeatedFormats(
      activities.map((activity) => activity.title),
    );

    const candidates = activities
      .map((activity) => {
        const activitySignals = signals.get(activity.id) ?? NO_SOURCE_SIGNALS;
        const assessment = assessActivity({
          title: activity.title,
          category: activity.category,
          costType: activity.costType,
          tags: activity.activityTags.map(({ tag }) => tag.name),
          startTimes: activity.dates.map((date) => date.startsAt),
          isRecurring: activity.dates.some((date) => date.recurrenceRule),
          signals: activitySignals,
        });
        const repeatedFormatCount =
          repeated.get(formatKey(activity.title)) ?? null;
        return {
          activity: toActivityResponse(activity, week),
          score: assessment.score,
          reasons: assessment.reasons,
          exclusion:
            assessment.exclusion ??
            (repeatedFormatCount ? QualityExclusion.RepeatedFormat : null),
          repeatedFormatCount,
          // Library listings have no lister, so each branch counts as one.
          organizer:
            activitySignals.organizer ??
            activity.venue?.name.toLowerCase() ??
            null,
          suggested: false,
        };
      })
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.activity.dates[0].startsAt.localeCompare(
            right.activity.dates[0].startsAt,
          ),
      );
    const suggested = new Set(
      suggestPicks(
        candidates.map(({ activity, score, exclusion, organizer }) => ({
          id: activity.id,
          score,
          exclusion,
          organizer,
        })),
        SUGGESTED_PICKS,
      ),
    );
    return candidates.map((candidate) => ({
      ...candidate,
      suggested: suggested.has(candidate.activity.id),
    }));
  }
}

/**
 * A pick must be a live activity with a session in the guide's week, and a
 * published guide may only show published activities.
 */
function validatePicks(
  activityIds: string[],
  activities: Activity[],
  week: GuideWeek,
  guideStatus: WeeklyGuideStatus,
): void {
  const byId = new Map(activities.map((activity) => [activity.id, activity]));
  for (const id of activityIds) {
    const activity = byId.get(id);
    if (!activity) {
      throw new BadRequestException(`Activity "${id}" does not exist`);
    }
    if (activity.status === ActivityStatus.Cancelled) {
      throw new BadRequestException(`"${activity.title}" is cancelled`);
    }
    if (activity.status === ActivityStatus.Rejected) {
      throw new BadRequestException(`"${activity.title}" was rejected`);
    }
    if (
      guideStatus === WeeklyGuideStatus.Published &&
      activity.status !== ActivityStatus.Published
    ) {
      throw new ConflictException(
        `"${activity.title}" is still a draft. Publish it before publishing the guide.`,
      );
    }
    if (
      !activity.dates.some(
        (date) => date.startsAt >= week.from && date.startsAt < week.to,
      )
    ) {
      throw new BadRequestException(
        `"${activity.title}" has no session in the week of ${week.weekStart}`,
      );
    }
  }
}

function toGuideResponse(
  guide: WeeklyGuide,
  week: GuideWeek,
  isVisible: (activity: Activity) => boolean = () => true,
): WeeklyGuideResponseDto {
  return {
    weekStart: guide.weekStart,
    status: guide.status,
    intro: guide.intro,
    publishedAt: guide.publishedAt?.toISOString() ?? null,
    items: [...guide.items]
      .sort((left, right) => left.position - right.position)
      .filter((item) => isVisible(item.activity))
      .map((item) => ({
        activity: toActivityResponse(item.activity, week),
        note: item.note,
      })),
  };
}
