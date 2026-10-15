import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import { Activity } from '../activities/entities/activity.entity';
import { GeminiQuotaService } from './gemini-quota.service';
import { TopicRelevanceService } from './topic-relevance.service';

jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn() }));

describe('Gemini topic relevance', () => {
  const createInteraction = jest.fn();
  const pottery = activity('pottery', 'Pottery for beginners');
  const gin = activity('gin', 'Gin tasting');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(GoogleGenAI).mockImplementation(
      () =>
        ({
          interactions: { create: createInteraction },
        }) as unknown as GoogleGenAI,
    );
    createInteraction.mockResolvedValue(
      response([
        { index: 0, relevance: 3, reason: 'Hands-on clay class' },
        { index: 1, relevance: 0, reason: 'Not a skill' },
      ]),
    );
  });

  it('rates each activity against the description with minimal thinking', async () => {
    const fits = await service().score('Learn a hands-on skill', [
      pottery,
      gin,
    ]);

    expect(fits).toEqual(
      new Map([
        ['pottery', { relevance: 3, reason: 'Hands-on clay class' }],
        ['gin', { relevance: 0, reason: '' }],
      ]),
    );
    const [request] = createInteraction.mock.calls[0] as [
      { input: string; generation_config: unknown },
    ];
    expect(request.input).toContain('Looking for: Learn a hands-on skill');
    expect(request.input).toContain('"title":"Pottery for beginners"');
    expect(request.generation_config).toEqual({ thinking_level: 'minimal' });
  });

  it('reuses ratings for the same description and activity version', async () => {
    const relevance = service();
    await relevance.score('Learn a hands-on skill', [pottery, gin]);
    const again = await relevance.score('learn a hands-on skill ', [
      gin,
      pottery,
    ]);

    expect(again?.get('pottery')?.relevance).toBe(3);
    expect(createInteraction).toHaveBeenCalledTimes(1);
  });

  it('rescores an activity after it changes', async () => {
    const relevance = service();
    await relevance.score('Learn a hands-on skill', [pottery]);
    createInteraction.mockResolvedValue(
      response([{ index: 0, relevance: 1, reason: 'Some clay' }]),
    );
    const edited = { ...pottery, updatedAt: new Date('2026-10-02') };

    const fits = await relevance.score('Learn a hands-on skill', [edited]);

    expect(fits?.get('pottery')).toEqual({ relevance: 1, reason: 'Some clay' });
  });

  it('treats activities the model left out as unrelated without remembering that', async () => {
    createInteraction.mockResolvedValue(
      response([
        { index: 0, relevance: 2, reason: 'Clay' },
        { index: 7, relevance: 3, reason: 'Unknown index' },
      ]),
    );
    const relevance = service();

    const fits = await relevance.score('Learn a skill', [pottery, gin]);
    await relevance.score('Learn a skill', [pottery, gin]);

    expect(fits?.get('gin')).toEqual({ relevance: 0, reason: '' });
    expect(fits?.size).toBe(2);
    const [retry] = createInteraction.mock.calls[1] as [{ input: string }];
    expect(retry.input).toContain('"title":"Gin tasting"');
    expect(retry.input).not.toContain('Pottery for beginners');
  });

  it.each([
    ['invalid structure', () => response([{ index: 0, relevance: 5 }])],
    ['malformed JSON', () => ({ output_text: '{oops' })],
  ])('returns null for %s', async (_, value) => {
    createInteraction.mockResolvedValue(value());
    expect(await service().score('Learn', [pottery])).toBeNull();
  });

  it('returns null when the request fails', async () => {
    createInteraction.mockRejectedValue(new Error('timeout'));
    expect(await service().score('Learn', [pottery])).toBeNull();
  });

  it('returns null without calling Gemini when there is no key or budget', async () => {
    expect(
      await service({ GEMINI_API_KEY: '' }).score('Learn', [pottery]),
    ).toBeNull();
    expect(
      await service({
        GEMINI_API_KEY: 'test-key',
        GEMINI_DAILY_REQUEST_LIMIT: 1,
      }).score('Learn', [pottery]),
    ).toBeNull();
    expect(createInteraction).not.toHaveBeenCalled();
  });
});

function service(
  values: Record<string, unknown> = { GEMINI_API_KEY: 'test-key' },
): TopicRelevanceService {
  const config = new ConfigService(values);
  return new TopicRelevanceService(config, new GeminiQuotaService(config));
}

function response(items: unknown[]) {
  return {
    output_text: JSON.stringify({ items }),
    usage: { total_input_tokens: 100, total_output_tokens: 20 },
  };
}

function activity(id: string, title: string): Activity {
  return {
    id,
    title,
    summary: null,
    description: `${title}   in Hamilton`,
    category: 'workshop',
    venue: { name: 'Hall' },
    activityTags: [{ tag: { name: 'Workshop' } }],
    updatedAt: new Date('2026-10-01'),
  } as unknown as Activity;
}
