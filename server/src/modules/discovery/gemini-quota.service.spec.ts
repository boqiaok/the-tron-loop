import { ConfigService } from '@nestjs/config';
import { GeminiQuotaService } from './gemini-quota.service';

describe('Gemini daily budget', () => {
  const morning = new Date('2026-10-16T15:00:00Z'); // 08:00 in Los Angeles

  it('leaves part of the daily limit for parsing once relevance scoring stops', () => {
    const quota = new GeminiQuotaService(
      new ConfigService({ GEMINI_DAILY_REQUEST_LIMIT: 10 }),
    );

    const relevance = Array.from({ length: 8 }, () =>
      quota.tryConsume('relevance', morning),
    );
    const parse = Array.from({ length: 4 }, () =>
      quota.tryConsume('parse', morning),
    );

    expect(relevance.filter(Boolean)).toHaveLength(7);
    expect(parse).toEqual([true, true, true, false]);
  });

  it('starts a new budget at midnight Pacific time', () => {
    const quota = new GeminiQuotaService(
      new ConfigService({ GEMINI_DAILY_REQUEST_LIMIT: 1 }),
    );

    expect(quota.tryConsume('parse', morning)).toBe(true);
    expect(quota.tryConsume('parse', new Date('2026-10-17T06:59:00Z'))).toBe(
      false,
    );
    expect(quota.tryConsume('parse', new Date('2026-10-17T07:00:00Z'))).toBe(
      true,
    );
  });
});
