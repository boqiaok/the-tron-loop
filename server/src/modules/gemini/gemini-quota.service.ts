import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Gemini resets requests-per-day quotas at midnight Pacific time. */
const QUOTA_TIMEZONE = 'America/Los_Angeles';
// Share of the daily quota relevance scoring may use, so request parsing
// keeps working after ranking has fallen back to keyword matching.
const RELEVANCE_SHARE = 0.7;
// Share drafting listing blurbs may use on its own, so background drafting
// never takes the budget people's searches need.
const BLURB_SHARE = 0.2;

export type GeminiPurpose = 'parse' | 'relevance' | 'blurb';

/**
 * Counts Gemini requests against the project's daily quota so callers fall
 * back before the API starts refusing requests. The count lives in memory,
 * which suits the single server instance this project runs.
 */
@Injectable()
export class GeminiQuotaService {
  private day = '';
  private used = 0;
  private blurbsUsed = 0;

  constructor(private readonly config: ConfigService) {}

  /** Records one request for `purpose`, or returns false when none is left. */
  tryConsume(purpose: GeminiPurpose, now = new Date()): boolean {
    const today = quotaDay(now);
    if (today !== this.day) {
      this.day = today;
      this.used = 0;
      this.blurbsUsed = 0;
    }
    const dailyLimit = this.config.get<number>(
      'GEMINI_DAILY_REQUEST_LIMIT',
      500,
    );
    const limit =
      purpose === 'relevance'
        ? Math.floor(dailyLimit * RELEVANCE_SHARE)
        : dailyLimit;
    if (this.used >= limit) return false;
    if (
      purpose === 'blurb' &&
      this.blurbsUsed >= Math.floor(dailyLimit * BLURB_SHARE)
    ) {
      return false;
    }
    this.used += 1;
    if (purpose === 'blurb') this.blurbsUsed += 1;
    return true;
  }
}

function quotaDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: QUOTA_TIMEZONE }).format(
    now,
  );
}
