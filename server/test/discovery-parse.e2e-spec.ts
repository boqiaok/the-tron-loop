import { GoogleGenAI } from '@google/genai';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { DiscoveryController } from '../src/modules/discovery/discovery.controller';
import { DiscoveryService } from '../src/modules/discovery/discovery.service';
import { ActivityDate } from '../src/modules/activities/entities/activity-date.entity';
import { setupApp } from '../src/app.setup';

jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn() }));

describe('Discovery parse HTTP contract (no database)', () => {
  let app: INestApplication<App>;
  const createInteraction = jest.fn();
  const config = new ConfigService({
    WEB_ORIGIN: 'http://localhost:3000',
    GEMINI_API_KEY: 'test-key',
  });
  const input = {
    text: 'Saturday afternoon',
    referenceTime: '2026-09-18T10:00:00+12:00',
    timezone: 'Pacific/Auckland',
  };
  const valid = {
    date: '2026-09-19',
    availableFrom: '12:00',
    availableTo: '17:00',
    familyFriendly: null,
    environment: null,
    freeOnly: null,
    preferFree: null,
    interests: [],
    suburb: null,
    targetActivityCount: null,
    travelMode: null,
    unresolved: [],
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [DiscoveryController],
      providers: [
        DiscoveryService,
        { provide: ConfigService, useValue: config },
        { provide: getRepositoryToken(ActivityDate), useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication();
    setupApp(app, config);
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    config.set('GEMINI_API_KEY', 'test-key');
    jest.mocked(GoogleGenAI).mockImplementation(
      () =>
        ({
          interactions: { create: createInteraction },
        }) as unknown as GoogleGenAI,
    );
    createInteraction.mockResolvedValue({ output_text: JSON.stringify(valid) });
  });
  afterAll(async () => {
    await app.close();
  });
  it('returns the existing DiscoveryIntent shape', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/discovery/parse')
      .send(input)
      .expect(200);
    expect(response.body).toEqual({
      source: 'openai',
      unresolved: [],
      manualEntryRequired: false,
      intent: {
        date: valid.date,
        availableFrom: '12:00',
        availableTo: '17:00',
        timezone: 'Pacific/Auckland',
        required: {},
        preferred: { interests: [] },
        targetActivityCount: 2,
        travelMode: 'driving',
      },
    });
  });
  it('searches the full day when the model has no time window', async () => {
    createInteraction.mockResolvedValue({
      output_text: JSON.stringify({
        ...valid,
        availableFrom: null,
        availableTo: null,
      }),
    });
    const response = await request(app.getHttpServer())
      .post('/api/v1/discovery/parse')
      .send({ ...input, text: 'activities this Sunday' })
      .expect(200);
    const body = response.body as {
      intent: { availableFrom: string; availableTo: string };
      manualEntryRequired: boolean;
    };
    expect(body.intent).toEqual(
      expect.objectContaining({ availableFrom: '00:00', availableTo: '23:59' }),
    );
    expect(body.manualEntryRequired).toBe(false);
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
    const response = await request(app.getHttpServer())
      .post('/api/v1/discovery/parse')
      .send({ ...input, text: 'activities' })
      .expect(200);
    const body = response.body as {
      intent: { date: string; availableFrom: string; availableTo: string };
      unresolved: string[];
      manualEntryRequired: boolean;
    };
    expect(body.intent).toEqual(
      expect.objectContaining({
        date: '2026-09-18',
        availableFrom: '00:00',
        availableTo: '23:59',
      }),
    );
    expect(body.unresolved).toEqual([
      'No date specified; showing activities for the next 7 days.',
    ]);
    expect(body.manualEntryRequired).toBe(false);
  });
  it('explains weekend scope when the request has no date', async () => {
    createInteraction.mockResolvedValue({
      output_text: JSON.stringify({
        ...valid,
        date: null,
        availableFrom: null,
        availableTo: null,
      }),
    });
    const response = await request(app.getHttpServer())
      .post('/api/v1/discovery/parse')
      .send({ ...input, text: 'activities this weekend' })
      .expect(200);
    const body = response.body as {
      unresolved: string[];
      manualEntryRequired: boolean;
    };

    expect(body.unresolved).toEqual([
      'No date specified; showing activities for this weekend.',
    ]);
    expect(body.manualEntryRequired).toBe(false);
  });
  it.each([
    'missing key',
    'timeout',
    'exception',
    'invalid structure',
    'invalid JSON',
  ])('uses deterministic local parsing for %s', async (scenario) => {
    if (scenario === 'missing key') config.set('GEMINI_API_KEY', '');
    if (scenario === 'timeout')
      createInteraction.mockRejectedValue(
        Object.assign(new Error('timeout'), { name: 'TimeoutError' }),
      );
    if (scenario === 'exception')
      createInteraction.mockRejectedValue(new Error('unavailable'));
    if (scenario === 'invalid structure')
      createInteraction.mockResolvedValue({
        output_text: JSON.stringify({ ...valid, interests: 'wrong' }),
      });
    if (scenario === 'invalid JSON')
      createInteraction.mockResolvedValue({ output_text: 'invalid' });
    const response = await request(app.getHttpServer())
      .post('/api/v1/discovery/parse')
      .send(input)
      .expect(200);
    expect(response.body).toMatchObject({
      intent: {
        date: '2026-09-19',
        availableFrom: '12:00',
        availableTo: '17:00',
        required: {},
        preferred: { interests: [] },
      },
      source: 'manual',
      unresolved: [],
      manualEntryRequired: false,
    });
    if (scenario === 'missing key')
      expect(createInteraction).not.toHaveBeenCalled();
  });
  it('still validates the request DTO', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/discovery/parse')
      .send({ ...input, timezone: 'UTC' })
      .expect(400);
    expect(createInteraction).not.toHaveBeenCalled();
  });
});
