import { ActivityCostType } from '../activities/enums/activity-cost-type.enum';
import { RejectionReason } from '../activities/enums/rejection-reason.enum';
import {
  formatKey,
  QualityAssessment,
  QualityExclusion,
  QualityReason,
} from './activity-quality';

/**
 * Editorial rules that sort draft activities for a family and community
 * guide, so an editor can publish the clear cases in bulk and read only the
 * uncertain ones. Skip reasons win over risks, and risks win over the signals
 * that recommend an activity.
 */

export enum ReviewGroup {
  Recommended = 'recommended',
  Review = 'review',
  Skip = 'skip',
}

export enum ReviewReason {
  // Why an activity is safe to publish.
  TrustedSource = 'trusted_source',
  PreviouslyPublished = 'previously_published',
  OneOff = 'one_off',
  ShortRun = 'short_run',
  // Why an editor should read it first.
  Adult = 'adult',
  Wellness = 'wellness',
  Business = 'business',
  CostUnknown = 'cost_unknown',
  UnfamiliarRegular = 'unfamiliar_regular',
  UnverifiedLongRun = 'unverified_long_run',
  OrganizerRejected = 'organizer_rejected',
  NoSignal = 'no_signal',
  // Why it should not be published.
  Service = 'service',
  Gambling = 'gambling',
  SoldOut = 'sold_out',
  Duplicate = 'duplicate',
  RepeatedFormat = 'repeated_format',
  PreviouslyRejected = 'previously_rejected',
}

const ADULT_TAGS = /bar djs|socials, singles|nightlife|r18/i;
const ADULT_TITLES = /speed dating|\br18\b|\b18\+/i;
const WELLNESS_TAGS = /mind & body|spiritual/i;
const WELLNESS_TITLES =
  /meditat|healing|energy medicine|reiki|sound bowl|sound bath|bodytalk/i;
const BUSINESS_TAGS = /business & professional|seminar|networking|conference/i;
/** The same title at this many venues is a format, such as a pub quiz. */
const REPEATED_FORMAT_MIN_VENUES = 3;

/** The rejection an editor most likely means by each skip reason. */
const REJECTION_FOR_SKIP: Partial<Record<ReviewReason, RejectionReason>> = {
  [ReviewReason.Service]: RejectionReason.NotAvailable,
  [ReviewReason.Gambling]: RejectionReason.NotSuitable,
  [ReviewReason.SoldOut]: RejectionReason.NotAvailable,
  [ReviewReason.Duplicate]: RejectionReason.Duplicate,
  [ReviewReason.RepeatedFormat]: RejectionReason.NotSuitable,
  [ReviewReason.PreviouslyRejected]: RejectionReason.NotSuitable,
};

const SKIP_EXCLUSIONS: Partial<Record<QualityExclusion, ReviewReason>> = {
  [QualityExclusion.Service]: ReviewReason.Service,
  [QualityExclusion.Gambling]: ReviewReason.Gambling,
  [QualityExclusion.SoldOut]: ReviewReason.SoldOut,
};

export interface ReviewInput {
  title: string;
  tags: string[];
  costType: ActivityCostType;
  assessment: QualityAssessment;
  /** A library, museum or administrator is behind the listing. */
  trustedSource: boolean;
  /** An activity with this title or organizer has been published before. */
  previouslyPublished: boolean;
  /** An activity with this title was rejected as not suitable. */
  titleRejected: boolean;
  /** Another activity by this organizer was rejected as not suitable. */
  organizerRejected: boolean;
  duplicate: boolean;
  repeatedFormat: boolean;
}

export interface ReviewClassification {
  group: ReviewGroup;
  /** Skip reasons first, then risks, then recommending signals. */
  reasons: ReviewReason[];
  /** For a skipped activity, the rejection its first skip reason implies. */
  suggestedRejection: RejectionReason | null;
}

export function classifyForReview(input: ReviewInput): ReviewClassification {
  const tagText = input.tags.join(' | ');
  const familiar = input.trustedSource || input.previouslyPublished;
  const has = (reason: QualityReason) =>
    input.assessment.reasons.includes(reason);

  const skips: ReviewReason[] = [];
  const exclusion =
    input.assessment.exclusion && SKIP_EXCLUSIONS[input.assessment.exclusion];
  if (exclusion) skips.push(exclusion);
  if (input.duplicate) skips.push(ReviewReason.Duplicate);
  if (input.repeatedFormat) skips.push(ReviewReason.RepeatedFormat);
  if (input.titleRejected) skips.push(ReviewReason.PreviouslyRejected);

  const risks: ReviewReason[] = [];
  if (ADULT_TAGS.test(tagText) || ADULT_TITLES.test(input.title)) {
    risks.push(ReviewReason.Adult);
  }
  if (WELLNESS_TAGS.test(tagText) || WELLNESS_TITLES.test(input.title)) {
    risks.push(ReviewReason.Wellness);
  }
  if (BUSINESS_TAGS.test(tagText)) risks.push(ReviewReason.Business);
  if (input.costType === ActivityCostType.Unknown) {
    risks.push(ReviewReason.CostUnknown);
  }
  if (!familiar && has(QualityReason.WeeklyRegular)) {
    risks.push(ReviewReason.UnfamiliarRegular);
  }
  if (!familiar && has(QualityReason.LongRun)) {
    risks.push(ReviewReason.UnverifiedLongRun);
  }
  if (input.organizerRejected) risks.push(ReviewReason.OrganizerRejected);

  const signals: ReviewReason[] = [];
  if (input.trustedSource) signals.push(ReviewReason.TrustedSource);
  if (input.previouslyPublished) {
    signals.push(ReviewReason.PreviouslyPublished);
  }
  if (has(QualityReason.OneOff)) signals.push(ReviewReason.OneOff);
  if (has(QualityReason.ShortRun)) signals.push(ReviewReason.ShortRun);

  const reasons = [...skips, ...risks, ...signals];
  if (skips.length) {
    return {
      group: ReviewGroup.Skip,
      reasons,
      suggestedRejection: REJECTION_FOR_SKIP[skips[0]] ?? null,
    };
  }
  const suggestedRejection = null;
  if (risks.length) {
    return { group: ReviewGroup.Review, reasons, suggestedRejection };
  }
  if (signals.length) {
    return { group: ReviewGroup.Recommended, reasons, suggestedRejection };
  }
  return {
    group: ReviewGroup.Review,
    reasons: [ReviewReason.NoSignal],
    suggestedRejection,
  };
}

export interface ReviewDate {
  startsAt: Date;
  endsAt: Date | null;
  recurrenceRule: string | null;
}

/**
 * Every date has finished. A recurring date runs until its UNTIL date; a
 * series limited by COUNT is treated as current because its end is not stored.
 */
export function hasEnded(dates: ReviewDate[], now: Date): boolean {
  if (!dates.length) return false;
  return dates.every((date) => {
    if (date.recurrenceRule) {
      const until = /UNTIL=(\d{4})(\d{2})(\d{2})/i.exec(date.recurrenceRule);
      if (!until) return false;
      const [, year, month, day] = until;
      // Compared by calendar day, so the whole UNTIL day counts as current.
      return new Date(`${year}-${month}-${day}T23:59:59Z`) < now;
    }
    return (date.endsAt ?? date.startsAt) < now;
  });
}

export interface ListingIdentity {
  id: string;
  title: string;
  venueId: string | null;
  startTimes: Date[];
}

export interface DraftIdentity extends ListingIdentity {
  soldOut: boolean;
  createdAt: Date;
}

/**
 * Finds drafts that repeat a current published activity or another draft:
 * the same title at the same venue or the same start time. Among drafts, the
 * one kept is the one people can still book with the most dates.
 * Returns the ID each duplicate repeats.
 */
export function findDuplicates(
  drafts: DraftIdentity[],
  currentPublished: ListingIdentity[],
): Map<string, string> {
  const duplicates = new Map<string, string>();
  const kept = groupByTitle(currentPublished);
  const preferred = [...drafts].sort(
    (left, right) =>
      Number(left.soldOut) - Number(right.soldOut) ||
      right.startTimes.length - left.startTimes.length ||
      left.createdAt.getTime() - right.createdAt.getTime(),
  );

  for (const draft of preferred) {
    const key = formatKey(draft.title);
    const sameTitle = kept.get(key) ?? [];
    const original = sameTitle.find((listing) => isSameListing(draft, listing));
    if (original) {
      duplicates.set(draft.id, original.id);
    } else {
      kept.set(key, [...sameTitle, draft]);
    }
  }

  return duplicates;
}

function isSameListing(left: ListingIdentity, right: ListingIdentity) {
  if (left.venueId && left.venueId === right.venueId) return true;
  const starts = new Set(right.startTimes.map((date) => date.getTime()));
  return left.startTimes.some((date) => starts.has(date.getTime()));
}

function groupByTitle(listings: ListingIdentity[]) {
  const groups = new Map<string, ListingIdentity[]>();
  for (const listing of listings) {
    const key = formatKey(listing.title);
    groups.set(key, [...(groups.get(key) ?? []), listing]);
  }
  return groups;
}

/**
 * Title keys that appear at several venues, such as quiz nights at many bars.
 * A listing without a venue counts as a venue of its own.
 */
export function findRepeatedFormatKeys(
  listings: ListingIdentity[],
): Set<string> {
  const venues = new Map<string, Set<string>>();
  for (const listing of listings) {
    const key = formatKey(listing.title);
    const keyVenues = venues.get(key) ?? new Set<string>();
    keyVenues.add(listing.venueId ?? listing.id);
    venues.set(key, keyVenues);
  }
  return new Set(
    [...venues]
      .filter(([, keyVenues]) => keyVenues.size >= REPEATED_FORMAT_MIN_VENUES)
      .map(([key]) => key),
  );
}
