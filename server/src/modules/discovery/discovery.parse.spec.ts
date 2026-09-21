import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import { DiscoveryService } from './discovery.service';

jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn() }));

const input = {
  text: 'Saturday afternoon indoors with the kids, preferably free',
  referenceTime: '2026-09-18T10:00:00+12:00',
  timezone: 'Pacific/Auckland' as const,
};
const valid = {
  date: '2026-09-19',
  availableFrom: '12:00',
  availableTo: '17:00',
  familyFriendly: true,
  environment: 'indoor',
  freeOnly: null,
  preferFree: true,
  interests: ['crafts'],
  suburb: null,
  targetActivityCount: null,
  travelMode: null,
  unresolved: [],
};

describe('Gemini discovery parsing', () => {
  const createInteraction = jest.fn();
  let service: DiscoveryService;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(GoogleGenAI).mockImplementation(
      () =>
        ({
          interactions: { create: createInteraction },
        }) as unknown as GoogleGenAI,
    );
    service = new DiscoveryService(
      {} as never,
      new ConfigService({ GEMINI_API_KEY: 'test-key' }),
    );
    createInteraction.mockResolvedValue({ output_text: JSON.stringify(valid) });
  });

  it('preserves the parse contract and normalizes preferences and defaults', async () => {
    expect(await service.parse(input)).toEqual({
      source: 'openai',
      unresolved: [],
      manualEntryRequired: false,
      intent: {
        date: valid.date,
        availableFrom: '12:00',
        availableTo: '17:00',
        timezone: 'Pacific/Auckland',
        required: { familyFriendly: true, environment: 'indoor' },
        preferred: { free: true, interests: ['crafts'] },
        targetActivityCount: 2,
        travelMode: 'driving',
      },
    });
    expect(createInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-3.5-flash-lite',
        store: false,
        input: expect.stringContaining(input.referenceTime) as unknown,
        response_format: expect.objectContaining({
          mime_type: 'application/json',
          schema: expect.objectContaining({
            additionalProperties: false,
          }) as unknown,
        }) as unknown,
      }),
      { timeout_ms: 8000, retries: { strategy: 'none' } },
    );
  });

  it('honors the configured model', async () => {
    service = new DiscoveryService(
      {} as never,
      new ConfigService({
        GEMINI_API_KEY: 'test-key',
        GEMINI_MODEL: 'custom-model',
      }),
    );
    await service.parse(input);
    expect(createInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'custom-model' }),
      expect.anything(),
    );
  });

  it('uses the full local day when a date has no time window', async () => {
    createInteraction.mockResolvedValue({
      output_text: JSON.stringify({
        ...valid,
        availableFrom: null,
        availableTo: null,
      }),
    });

    const result = await service.parse({
      ...input,
      text: 'activities this Sunday',
    });
    expect(result.manualEntryRequired).toBe(false);
    expect(result.intent?.availableFrom).toBe('00:00');
    expect(result.intent?.availableTo).toBe('23:59');
  });

  it('uses the next 7 days when the request has no date', async () => {
    createInteraction.mockResolvedValue({
      output_text: JSON.stringify({
        ...valid,
        date: null,
        availableFrom: null,
        availableTo: null,
      }),
    });

    const result = await service.parse({ ...input, text: 'activities' });

    expect(result.unresolved).toEqual([
      'No date specified; showing activities for the next 7 days.',
    ]);
    expect(result.manualEntryRequired).toBe(false);
    expect(result.intent?.date).toBe('2026-09-18');
    expect(result.intent?.availableFrom).toBe('00:00');
    expect(result.intent?.availableTo).toBe('23:59');
  });

  it('calls out weekend scope when the request has no date', async () => {
    createInteraction.mockResolvedValue({
      output_text: JSON.stringify({
        ...valid,
        date: null,
        availableFrom: null,
        availableTo: null,
      }),
    });

    const result = await service.parse({
      ...input,
      text: 'activities this weekend',
    });

    expect(result.unresolved).toEqual([
      'No date specified; showing activities for this weekend.',
    ]);
    expect(result.manualEntryRequired).toBe(false);
  });

  it.each([undefined, '', '   '])(
    'falls back without calling Gemini for key %p',
    async (key) => {
      service = new DiscoveryService(
        {} as never,
        new ConfigService({ GEMINI_API_KEY: key }),
      );
      expect(await service.parse(input)).toMatchObject({
        intent: {
          date: '2026-09-19',
          availableFrom: '12:00',
          availableTo: '17:00',
          required: { familyFriendly: true, environment: 'indoor' },
          preferred: { free: true, interests: [] },
        },
        source: 'manual',
        manualEntryRequired: false,
      });
      expect(GoogleGenAI).not.toHaveBeenCalled();
    },
  );

  it.each(['TimeoutError', 'RateLimitError', 'Error'])(
    'falls back on %s',
    async (name) => {
      createInteraction.mockRejectedValue(
        Object.assign(new Error('provider failure'), { name }),
      );
      const result = await service.parse(input);
      expect(result.intent).not.toBeNull();
      expect(result).toMatchObject({
        source: 'manual',
        manualEntryRequired: false,
      });
    },
  );

  it.each([
    null,
    {},
    { ...valid, environment: 'invalid' },
    { ...valid, familyFriendly: 'true' },
    { ...valid, interests: [1] },
    { ...valid, interests: Array<string>(11).fill('crafts') },
    { ...valid, unresolved: null },
    { ...valid, travelMode: 'flying' },
    { ...valid, targetActivityCount: 4 },
    { ...valid, extra: true },
    { ...valid, date: '2026-02-30' },
    { ...valid, availableFrom: '25:00' },
    { ...valid, availableFrom: '17:00' },
  ])('falls back for invalid or incomplete output %p', async (value) => {
    createInteraction.mockResolvedValue({ output_text: JSON.stringify(value) });
    const result = await service.parse(input);
    expect(result.intent).not.toBeNull();
    expect(result).toMatchObject({
      source: 'manual',
      manualEntryRequired: false,
    });
  });

  it.each(['', '{invalid', undefined])(
    'falls back for malformed or empty text %p',
    async (text) => {
      createInteraction.mockResolvedValue({ output_text: text });
      const result = await service.parse(input);
      expect(result.intent).not.toBeNull();
      expect(result).toMatchObject({
        source: 'manual',
        manualEntryRequired: false,
      });
    },
  );

  it('keeps a generic topic search when Gemini is unavailable', async () => {
    service = new DiscoveryService(
      {} as never,
      new ConfigService({ GEMINI_API_KEY: '' }),
    );
    const result = await service.parse({
      ...input,
      text: 'dance',
      referenceTime: '2026-09-21T01:00:00.000Z',
    });

    expect(result).toMatchObject({
      source: 'manual',
      manualEntryRequired: false,
      intent: {
        date: '2026-09-21',
        availableFrom: '00:00',
        availableTo: '23:59',
        preferred: { interests: ['dance'] },
      },
    });
    expect(result.unresolved).toEqual([
      'No date specified; showing activities for the next 7 days.',
    ]);
  });

  it('keeps unresolved time ambiguity visible for manual correction', async () => {
    createInteraction.mockResolvedValue({
      output_text: JSON.stringify({ ...valid, unresolved: ['Confirm time'] }),
    });
    expect(await service.parse(input)).toMatchObject({
      source: 'openai',
      unresolved: ['Confirm time'],
      manualEntryRequired: true,
    });
  });
});
