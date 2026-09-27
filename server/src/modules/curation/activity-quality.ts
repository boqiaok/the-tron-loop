import { ActivityCategory } from '../activities/enums/activity-category.enum';
import { ActivityCostType } from '../activities/enums/activity-cost-type.enum';
import { SourceSignals } from '../ingestion/source-signals';

/**
 * Editorial rules that rank a week's activities for the weekly picks. The
 * score is a starting point for an editor, not a rating: it rewards scarce,
 * curated outings and moves weekly regulars and services out of the way.
 */

export enum QualityReason {
  OneOff = 'one_off',
  ShortRun = 'short_run',
  LongRun = 'long_run',
  SoldOut = 'sold_out',
  Featured = 'featured',
  Festival = 'festival',
  Performance = 'performance',
  Performers = 'performers',
  Market = 'market',
  WeeklyRegular = 'weekly_regular',
  Meetup = 'meetup',
  Free = 'free',
}

export enum QualityExclusion {
  Service = 'service',
  Gambling = 'gambling',
  SoldOut = 'sold_out',
  RepeatedFormat = 'repeated_format',
}

const BASE_SCORE = 40;
const REASON_WEIGHTS: Record<QualityReason, number> = {
  [QualityReason.OneOff]: 15,
  [QualityReason.ShortRun]: 8,
  [QualityReason.LongRun]: -6,
  [QualityReason.SoldOut]: 20,
  [QualityReason.Featured]: 5,
  [QualityReason.Festival]: 10,
  [QualityReason.Performance]: 10,
  [QualityReason.Performers]: 8,
  [QualityReason.Market]: 8,
  [QualityReason.WeeklyRegular]: -15,
  [QualityReason.Meetup]: -12,
  [QualityReason.Free]: 4,
};

const SHORT_RUN_MAX_SESSIONS = 5;
const LONG_RUN_MIN_SESSIONS = 20;
/** The same title at this many listings in one week is a format, not an event. */
const REPEATED_FORMAT_MIN_LISTINGS = 3;

const FESTIVAL_TAGS = /festival/i;
const PERFORMANCE_TAGS =
  /theatre|musical|classical music|opera|comedy|dance|concert|jazz|choir|literary|public talks/i;
const REGULAR_TAGS = /quiz|karaoke|bar djs|fitness|mind & body/i;
const SERVICE_TAGS = /community services/i;
const SERVICE_TITLES =
  /justice of the peace|digital drop-?in|st john community education|toastmasters|english learners/i;
const GAMBLING = /poker|casino/i;
const MEETUP_TITLES = /\b(chat|club|group|corner)\b/i;
const QUIZ_TITLES = /\bquiz/i;

export interface QualityInput {
  title: string;
  category: ActivityCategory;
  costType: ActivityCostType;
  tags: string[];
  /** Every scheduled start, not only those in the week being curated. */
  startTimes: Date[];
  isRecurring: boolean;
  signals: SourceSignals;
}

export interface QualityAssessment {
  score: number;
  reasons: QualityReason[];
  exclusion: QualityExclusion | null;
}

export function assessActivity(input: QualityInput): QualityAssessment {
  const reasons: QualityReason[] = [];
  const tagText = input.tags.join(' | ');
  const sessions = input.startTimes.length;
  const isRegular =
    input.isRecurring ||
    REGULAR_TAGS.test(tagText) ||
    QUIZ_TITLES.test(input.title) ||
    isWeeklySeries(input.startTimes);

  if (isRegular) reasons.push(QualityReason.WeeklyRegular);
  else if (sessions === 1) reasons.push(QualityReason.OneOff);
  else if (sessions <= SHORT_RUN_MAX_SESSIONS)
    reasons.push(QualityReason.ShortRun);
  else if (sessions >= LONG_RUN_MIN_SESSIONS)
    reasons.push(QualityReason.LongRun);

  if (input.signals.soldOut) reasons.push(QualityReason.SoldOut);
  if (input.signals.featured) reasons.push(QualityReason.Featured);
  if (FESTIVAL_TAGS.test(tagText)) reasons.push(QualityReason.Festival);
  if (PERFORMANCE_TAGS.test(tagText)) reasons.push(QualityReason.Performance);
  if (input.signals.performerCount > 0) reasons.push(QualityReason.Performers);
  if (input.category === ActivityCategory.Market)
    reasons.push(QualityReason.Market);
  if (MEETUP_TITLES.test(input.title)) reasons.push(QualityReason.Meetup);
  if (input.costType === ActivityCostType.Free)
    reasons.push(QualityReason.Free);

  const score = reasons.reduce(
    (total, reason) => total + REASON_WEIGHTS[reason],
    BASE_SCORE,
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons,
    exclusion: findExclusion(input, tagText),
  };
}

function findExclusion(
  input: QualityInput,
  tagText: string,
): QualityExclusion | null {
  if (SERVICE_TITLES.test(input.title) || SERVICE_TAGS.test(tagText)) {
    return QualityExclusion.Service;
  }
  if (GAMBLING.test(input.title) || GAMBLING.test(tagText)) {
    return QualityExclusion.Gambling;
  }
  // Sold out is strong evidence of quality but nobody can act on the pick.
  if (input.signals.soldOut) return QualityExclusion.SoldOut;
  return null;
}

/** Three or more starts spaced exactly a week apart. */
function isWeeklySeries(startTimes: Date[]): boolean {
  if (startTimes.length < 3) return false;
  const sorted = startTimes.map((date) => date.getTime()).sort((a, b) => a - b);
  const week = 7 * 24 * 60 * 60 * 1000;
  const tolerance = 60 * 60 * 1000;
  return sorted
    .slice(1)
    .every((time, index) => Math.abs(time - sorted[index] - week) <= tolerance);
}

/**
 * Groups listings that share a title, such as quiz nights at many bars.
 * Returns the group size for each key that meets the threshold.
 */
export function findRepeatedFormats(titles: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const title of titles) {
    const key = formatKey(title);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return new Map(
    [...counts].filter(([, count]) => count >= REPEATED_FORMAT_MIN_LISTINGS),
  );
}

export function formatKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/s\b/g, '');
}

export interface PickCandidate {
  id: string;
  score: number;
  exclusion: QualityExclusion | null;
  /** Who runs the activity, such as the lister or the library branch. */
  organizer: string | null;
}

/**
 * Chooses the highest-scoring eligible activities, one per organizer, so a
 * single festival or venue cannot fill the list. Ties keep the given order.
 */
export function suggestPicks(
  candidates: PickCandidate[],
  limit: number,
): string[] {
  const picks: string[] = [];
  const organizers = new Set<string>();

  for (const candidate of [...candidates].sort(
    (left, right) => right.score - left.score,
  )) {
    if (picks.length === limit) break;
    if (candidate.exclusion) continue;
    if (candidate.organizer && organizers.has(candidate.organizer)) continue;

    picks.push(candidate.id);
    if (candidate.organizer) organizers.add(candidate.organizer);
  }

  return picks;
}
