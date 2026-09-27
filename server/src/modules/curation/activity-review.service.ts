import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { toAdminActivityResponse } from '../activities/activity.mapper';
import { Activity } from '../activities/entities/activity.entity';
import { ActivityStatus } from '../activities/enums/activity-status.enum';
import { RejectionReason } from '../activities/enums/rejection-reason.enum';
import { NO_SOURCE_SIGNALS } from '../ingestion/source-signals';
import { SourceType } from '../ingestion/source-type.enum';
import { assessActivity, formatKey } from './activity-quality';
import {
  classifyForReview,
  findDuplicates,
  findRepeatedFormatKeys,
  hasEnded,
  ListingIdentity,
  ReviewGroup,
} from './activity-review';
import {
  ActivityReviewItemResponseDto,
  ActivityReviewResponseDto,
} from './dto/activity-review-response.dto';
import { SourceSignalsService } from './source-signals.service';

/** Institutions that publish their own programme; their listings are real. */
const TRUSTED_SOURCE_TYPES = new Set([
  SourceType.HamiltonLibraries,
  SourceType.WaikatoMuseum,
]);
const LISTING_IDENTITY_SELECT = {
  id: true,
  title: true,
  venueId: true,
  dates: { id: true, startsAt: true, endsAt: true, recurrenceRule: true },
} as const;
const GROUP_ORDER = [
  ReviewGroup.Recommended,
  ReviewGroup.Review,
  ReviewGroup.Skip,
];

@Injectable()
export class ActivityReviewService {
  constructor(
    @InjectRepository(Activity)
    private readonly activities: Repository<Activity>,
    private readonly sourceSignals: SourceSignalsService,
  ) {}

  async findDrafts(): Promise<ActivityReviewResponseDto> {
    const now = new Date();
    const [allDrafts, published, rejected] = await Promise.all([
      this.activities.find({
        where: { status: ActivityStatus.Draft },
        relations: {
          venue: true,
          dates: true,
          activityTags: { tag: true },
          source: true,
        },
      }),
      this.activities.find({
        where: { status: ActivityStatus.Published },
        select: LISTING_IDENTITY_SELECT,
        relations: { dates: true },
      }),
      // Other rejections say nothing about whether a title or organizer suits.
      this.activities.find({
        where: {
          status: ActivityStatus.Rejected,
          rejectionReason: RejectionReason.NotSuitable,
        },
        select: { id: true, title: true },
      }),
    ]);
    // Finished drafts cannot be published usefully, so they are not reviewed.
    const drafts = allDrafts.filter((draft) => !hasEnded(draft.dates, now));
    const signals = await this.sourceSignals.findForActivities(
      [...drafts, ...published, ...rejected].map(({ id }) => id),
    );
    const organizerOf = (id: string) =>
      (signals.get(id) ?? NO_SOURCE_SIGNALS).organizer;

    const publishedTitles = titleKeys(published);
    const publishedOrganizers = organizers(published, organizerOf);
    const rejectedTitles = titleKeys(rejected);
    const rejectedOrganizers = organizers(rejected, organizerOf);
    const duplicates = findDuplicates(
      drafts.map((draft) => ({
        ...toIdentity(draft),
        soldOut: signals.get(draft.id)?.soldOut ?? false,
        createdAt: draft.createdAt,
      })),
      published
        .filter((activity) => !hasEnded(activity.dates, now))
        .map(toIdentity),
    );
    const repeatedFormats = findRepeatedFormatKeys(
      [...drafts, ...published].map(toIdentity),
    );

    const items = drafts.map((draft): ActivityReviewItemResponseDto => {
      const draftSignals = signals.get(draft.id) ?? NO_SOURCE_SIGNALS;
      const titleKey = formatKey(draft.title);
      const organizer = draftSignals.organizer;
      const tags = draft.activityTags.map(({ tag }) => tag.name);
      const assessment = assessActivity({
        title: draft.title,
        category: draft.category,
        costType: draft.costType,
        tags,
        startTimes: draft.dates.map(({ startsAt }) => startsAt),
        isRecurring: draft.dates.some(({ recurrenceRule }) => recurrenceRule),
        signals: draftSignals,
      });
      const trustedSource =
        !draft.source || TRUSTED_SOURCE_TYPES.has(draft.source.sourceType);
      const { group, reasons, suggestedRejection } = classifyForReview({
        title: draft.title,
        tags,
        costType: draft.costType,
        assessment,
        trustedSource,
        previouslyPublished:
          publishedTitles.has(titleKey) ||
          (organizer !== null && publishedOrganizers.has(organizer)),
        titleRejected: rejectedTitles.has(titleKey),
        organizerRejected:
          organizer !== null && rejectedOrganizers.has(organizer),
        duplicate: duplicates.has(draft.id),
        // Institutions run the same programme at several branches on purpose.
        repeatedFormat: !trustedSource && repeatedFormats.has(titleKey),
      });

      return {
        activity: toAdminActivityResponse(draft),
        group,
        reasons,
        suggestedRejection,
        score: assessment.score,
        duplicateOfId: duplicates.get(draft.id) ?? null,
      };
    });

    items.sort(
      (left, right) =>
        GROUP_ORDER.indexOf(left.group) - GROUP_ORDER.indexOf(right.group) ||
        right.score - left.score ||
        nextStart(left, now) - nextStart(right, now),
    );

    return {
      counts: {
        recommended: countGroup(items, ReviewGroup.Recommended),
        review: countGroup(items, ReviewGroup.Review),
        skip: countGroup(items, ReviewGroup.Skip),
      },
      endedCount: allDrafts.length - drafts.length,
      items,
    };
  }
}

function titleKeys(activities: Activity[]): Set<string> {
  return new Set(activities.map(({ title }) => formatKey(title)));
}

function organizers(
  activities: Activity[],
  organizerOf: (id: string) => string | null,
): Set<string> {
  const names = new Set<string>();
  for (const { id } of activities) {
    const organizer = organizerOf(id);
    if (organizer) names.add(organizer);
  }
  return names;
}

function toIdentity(activity: Activity): ListingIdentity {
  return {
    id: activity.id,
    title: activity.title,
    venueId: activity.venueId,
    startTimes: activity.dates.map(({ startsAt }) => startsAt),
  };
}

/** The next start that has not ended, or the last start when all have. */
function nextStart(item: ActivityReviewItemResponseDto, now: Date): number {
  const starts = item.activity.dates.map((date) => ({
    start: Date.parse(date.startsAt),
    end: Date.parse(date.endsAt ?? date.startsAt),
  }));
  const upcoming = starts.find(({ end }) => end >= now.getTime());
  return upcoming?.start ?? starts.at(-1)?.start ?? Number.MAX_SAFE_INTEGER;
}

function countGroup(
  items: ActivityReviewItemResponseDto[],
  group: ReviewGroup,
): number {
  return items.filter((item) => item.group === group).length;
}
