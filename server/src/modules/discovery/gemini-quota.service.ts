import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Gemini resets requests-per-day quotas at midnight Pacific time. */
const QUOTA_TIMEZONE = 'America/Los_Angeles';
// Share of the daily quota relevance scoring may use, so request parsing
// keeps working after ranking has fallen back to keyword matching.
const RELEVANCE_SHARE = 0.7;

export type GeminiPurpose = 'parse' | 'relevance';

/**
 * Counts Gemini requests against the project's daily quota so the planner
 * falls back before the API starts refusing requests. The count lives in
 * memory, which suits the single server instance this project runs.
 */
@Injectable()
export class GeminiQuotaService {
  private day = '';
  private used = 0;

  constructor(private readonly config: ConfigService) {}

  /** Records one request for `purpose`, or returns false when none is left. */
  tryConsume(purpose: GeminiPurpose, now = new Date()): boolean {
    const today = quotaDay(now);
    if (today !== this.day) {
      this.day = today;
      this.used = 0;
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
    this.used += 1;
    return true;
  }
}

function quotaDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: QUOTA_TIMEZONE }).format(
    now,
  );
}
