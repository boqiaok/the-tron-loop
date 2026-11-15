import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import { IsNull, Repository } from 'typeorm';
import { Activity } from '../activities/entities/activity.entity';
import { ActivityCategory } from '../activities/enums/activity-category.enum';
import { GeminiQuotaService } from '../gemini/gemini-quota.service';
import { ActivityBlurbsService, cleanBlurb } from './activity-blurbs.service';

jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn() }));

describe('Listing blurbs', () => {
  const now = new Date('2026-11-16T00:00:00Z');
  const createInteraction = jest.fn();
  const update = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(GoogleGenAI).mockImplementation(
      () =>
        ({
          interactions: { create: createInteraction },
        }) as unknown as GoogleGenAI,
    );
  });

  it('drafts a blurb for each listing and records when it asked', async () => {
    const concert = activity('concert', 'Convergence', 'A one hour concert.');
    const circus = activity('circus', 'Circus in the Centre', 'Free circus.');
    createInteraction.mockResolvedValue(
      response([
        {
          index: 0,
          blurb: 'A one-hour concert pairing piano with taonga pūoro.',
        },
        { index: 1, blurb: '  Drop-in   circus skills for the whole family. ' },
      ]),
    );

    await service({ pending: [concert, circus] }).draftMissing(now);

    const [request] = createInteraction.mock.calls[0] as [
      { input: string; generation_config: unknown },
    ];
    expect(request.input).toContain('"title":"Convergence"');
    expect(request.input).toContain('"about":"A one hour concert."');
    expect(request.generation_config).toEqual({ thinking_level: 'minimal' });
    expect(update.mock.calls).toEqual([
      [
        expect.objectContaining({ id: 'concert' }),
        {
          blurb: 'A one-hour concert pairing piano with taonga pūoro.',
          blurbDraftedAt: now,
        },
      ],
      [
        expect.objectContaining({ id: 'circus' }),
        {
          blurb: 'Drop-in circus skills for the whole family.',
          blurbDraftedAt: now,
        },
      ],
    ]);
  });

  it('only writes listings that still have no blurb', async () => {
    createInteraction.mockResolvedValue(
      response([{ index: 0, blurb: 'A guided walk.' }]),
    );

    await service({
      pending: [activity('walk', 'Walk', 'A walk.')],
    }).draftMissing(now);

    const [where] = update.mock.calls[0] as [Record<string, unknown>];
    expect(where).toEqual({ id: 'walk', blurb: IsNull() });
  });

  it('shares one blurb across a series instead of asking again', async () => {
    const monday = activity('mon', 'Storytime', 'Stories for preschoolers.');
    const tuesday = activity('tue', ' storytime ', 'Stories for preschoolers.');
    const earlier = activity('old', 'Pottery', 'Clay.');
    earlier.blurb = 'Hands-on clay for beginners.';
    const pottery = activity('pot', 'Pottery', 'Clay.');
    createInteraction.mockResolvedValue(
      response([{ index: 0, blurb: 'Songs and stories for preschoolers.' }]),
    );

    await service({
      pending: [monday, tuesday, pottery],
      written: [earlier],
    }).draftMissing(now);

    const [request] = createInteraction.mock.calls[0] as [{ input: string }];
    expect(request.input).not.toContain('Pottery');
    expect(blurbsById()).toEqual({
      pot: 'Hands-on clay for beginners.',
      mon: 'Songs and stories for preschoolers.',
      tue: 'Songs and stories for preschoolers.',
    });
  });

  it('records an empty draft so the same listing is not asked again', async () => {
    createInteraction.mockResolvedValue(
      response([{ index: 0, blurb: 'x'.repeat(201) }]),
    );

    await service({
      pending: [activity('long', 'Long', 'Text.')],
    }).draftMissing(now);

    expect(update).toHaveBeenCalledWith(expect.anything(), {
      blurb: null,
      blurbDraftedAt: now,
    });
  });

  it('leaves listings for the next run when Gemini fails', async () => {
    createInteraction.mockRejectedValue(new Error('timeout'));

    await service({ pending: [activity('a', 'A', 'Text.')] }).draftMissing(now);

    expect(update).not.toHaveBeenCalled();
  });

  it('stops when the daily budget for blurbs is used up', async () => {
    await service({
      pending: [activity('a', 'A', 'Text.')],
      dailyLimit: 1,
    }).draftMissing(now);

    expect(createInteraction).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('does nothing without an API key', async () => {
    await service({
      pending: [activity('a', 'A', 'Text.')],
      apiKey: '',
    }).draftMissing(now);

    expect(createInteraction).not.toHaveBeenCalled();
  });

  it('keeps only a sentence that fits the column', () => {
    expect(cleanBlurb('  A  walk. ')).toBe('A walk.');
    expect(cleanBlurb('   ')).toBeNull();
    expect(cleanBlurb('x'.repeat(201))).toBeNull();
  });

  function blurbsById(): Record<string, string | null> {
    return Object.fromEntries(
      update.mock.calls.map(([where, values]) => [
        (where as { id: string }).id,
        (values as { blurb: string | null }).blurb,
      ]),
    );
  }

  function service({
    pending,
    written = [],
    apiKey = 'test-key',
    dailyLimit = 500,
  }: {
    pending: Activity[];
    written?: Activity[];
    apiKey?: string;
    dailyLimit?: number;
  }): ActivityBlurbsService {
    const config = new ConfigService({
      GEMINI_API_KEY: apiKey,
      GEMINI_DAILY_REQUEST_LIMIT: dailyLimit,
      NODE_ENV: 'test',
    });
    const builder = (result: () => unknown) => {
      const chain: Record<string, unknown> = {};
      for (const method of [
        'select',
        'addSelect',
        'where',
        'andWhere',
        'orderBy',
        'limit',
      ]) {
        chain[method] = () => chain;
      }
      chain.getRawMany = () => Promise.resolve(result());
      chain.getMany = () => Promise.resolve(result());
      return chain;
    };
    const builders = [
      builder(() => pending.map(({ id }) => ({ id }))),
      builder(() => written),
    ];
    const repository = {
      createQueryBuilder: () => builders.shift(),
      find: () => Promise.resolve([...pending].reverse()),
      update,
    } as unknown as Repository<Activity>;
    return new ActivityBlurbsService(
      repository,
      config,
      new GeminiQuotaService(config),
    );
  }
});

function activity(id: string, title: string, description: string): Activity {
  return {
    id,
    title,
    description,
    summary: null,
    blurb: null,
    category: ActivityCategory.Community,
    venue: null,
  } as unknown as Activity;
}

function response(items: Array<{ index: number; blurb: string }>) {
  return {
    output_text: JSON.stringify({ items }),
    usage: { total_input_tokens: 100, total_output_tokens: 20 },
  };
}
