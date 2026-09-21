import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, In } from 'typeorm';
import { AppModule } from './../src/app.module';
import { setupApp } from './../src/app.setup';
import { Activity } from './../src/modules/activities/entities/activity.entity';
import { Tag } from './../src/modules/activities/entities/tag.entity';
import { Venue } from './../src/modules/activities/entities/venue.entity';
import { setupSwagger } from './../src/swagger';
import { AdminUser } from './../src/modules/auth/entities/admin-user.entity';
import { AdminSession } from './../src/modules/auth/entities/admin-session.entity';
import { hashPassword } from './../src/modules/auth/password';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Source } from './../src/modules/ingestion/entities/source.entity';
import { SourceType } from './../src/modules/ingestion/source-type.enum';

describe('Application (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let adminAgent: ReturnType<typeof request.agent>;
  let adminUserId: string;
  const activityIds: string[] = [];
  const tagIds: string[] = [];
  const venueIds: string[] = [];
  const sourceIds: string[] = [];
  let feedServer: Server;
  let feedUrl: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app, app.get(ConfigService));
    setupSwagger(app);
    await app.init();
    dataSource = app.get(DataSource);

    const password = 'e2e-administrator-password';
    const adminUser = await dataSource.getRepository(AdminUser).save({
      email: `e2e-${Date.now()}@example.com`,
      passwordHash: await hashPassword(password),
      isActive: true,
    });
    adminUserId = adminUser.id;
    adminAgent = request.agent(app.getHttpServer());
    await adminAgent
      .post('/api/v1/auth/admin/login')
      .send({ email: adminUser.email, password })
      .expect(200)
      .expect('set-cookie', /tron_admin_session=/);

    feedServer = createServer((_request, response) => {
      response.setHeader('Content-Type', 'application/json');
      response.end(
        JSON.stringify({
          items: [
            {
              externalId: 'feed-activity-1',
              title: 'Imported E2E Workshop',
              description: 'Imported from the E2E JSON feed',
              startsAt: '2026-08-15T14:00:00+12:00',
              endsAt: '2026-08-15T16:00:00+12:00',
              venue: {
                name: 'Imported E2E Venue',
                address: '2 Victoria Street',
                suburb: 'Hamilton Central',
              },
              tags: ['Imported'],
              costType: 'free',
            },
            {
              externalId: 'feed-activity-duplicate',
              title: 'Imported E2E Workshop',
              description: 'A duplicate from another source record',
              startsAt: '2026-08-15T14:00:00+12:00',
              endsAt: '2026-08-15T16:00:00+12:00',
              venue: {
                name: 'Imported E2E Venue',
                address: '2 Victoria Street',
                suburb: 'Hamilton Central',
              },
            },
          ],
        }),
      );
    });
    await new Promise<void>((resolve) => {
      feedServer.listen(0, '127.0.0.1', resolve);
    });
    const feedAddress = feedServer.address() as AddressInfo;
    feedUrl = `http://127.0.0.1:${feedAddress.port}/events.json`;
  });

  it('rejects unauthenticated administration requests', () => {
    return request(app.getHttpServer())
      .get('/api/v1/admin/activities')
      .expect(401);
  });

  it('returns the authenticated administrator session', async () => {
    const response = await adminAgent
      .get('/api/v1/auth/admin/session')
      .expect(200);
    const session = response.body as { id: string; email: string };
    expect(session.id).toBe(adminUserId);
    expect(session.email).toContain('@example.com');
  });

  it('uploads and removes an administrator image', async () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);
    const uploadResponse = await adminAgent
      .post('/api/v1/admin/media/images')
      .attach('file', png, {
        filename: 'activity.png',
        contentType: 'image/png',
      })
      .expect(201);
    const uploaded = uploadResponse.body as { filename: string; url: string };
    expect(uploaded.url).toMatch(
      new RegExp(`/media/images/${uploaded.filename.replace('.', '\\.')}$`),
    );

    await adminAgent
      .delete(`/api/v1/admin/media/images/${uploaded.filename}`)
      .expect(204);
  });

  it('rejects a file that only claims to be an image', () => {
    return adminAgent
      .post('/api/v1/admin/media/images')
      .attach('file', Buffer.from('not an image'), {
        filename: 'fake.png',
        contentType: 'image/png',
      })
      .expect(400);
  });

  it('imports JSON feed activities as drafts and records duplicates', async () => {
    const sourceResponse = await adminAgent
      .post('/api/v1/admin/sources')
      .send({
        name: `E2E feed ${Date.now()}`,
        sourceType: SourceType.JsonFeed,
        feedUrl,
        scheduleHours: 24,
      })
      .expect(201);
    const source = sourceResponse.body as { id: string };
    sourceIds.push(source.id);

    const firstRunResponse = await adminAgent
      .post(`/api/v1/admin/sources/${source.id}/import`)
      .expect(201);
    expect(firstRunResponse.body).toEqual(
      expect.objectContaining({
        status: 'succeeded',
        createdCount: 1,
        duplicateCount: 1,
        failedCount: 0,
      }),
    );

    const imported = await dataSource.getRepository(Activity).findOneByOrFail({
      sourceId: source.id,
      externalId: 'feed-activity-1',
    });
    activityIds.push(imported.id);
    expect(imported.status).toBe('draft');

    const secondRunResponse = await adminAgent
      .post(`/api/v1/admin/sources/${source.id}/import`)
      .expect(201);
    expect(secondRunResponse.body).toEqual(
      expect.objectContaining({
        status: 'succeeded',
        updatedCount: 1,
        duplicateCount: 1,
      }),
    );
  });

  it('publishes supported regular activities and rejects unsupported recurrence', async () => {
    await adminAgent
      .post('/api/v1/admin/activities')
      .send({
        title: `Invalid recurrence ${Date.now()}`,
        description: 'Invalid monthly recurrence',
        dates: [
          {
            startsAt: '2026-09-07T18:00:00+12:00',
            recurrenceRule: 'FREQ=MONTHLY',
          },
        ],
      })
      .expect(400);

    const createResponse = await adminAgent
      .post('/api/v1/admin/activities')
      .send({
        title: `Regular E2E Activity ${Date.now()}`,
        description: 'A supported recurring activity',
        dates: [
          {
            startsAt: '2026-09-07T18:00:00+12:00',
            endsAt: '2026-09-07T19:00:00+12:00',
            recurrenceRule:
              'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;UNTIL=20261231;EXDATE=20261026',
          },
        ],
      })
      .expect(201);
    const activity = createResponse.body as { id: string };
    activityIds.push(activity.id);
    await adminAgent
      .post(`/api/v1/admin/activities/${activity.id}/publish`)
      .expect(200);

    const regularResponse = await request(app.getHttpServer())
      .get('/api/v1/activities/regular')
      .expect(200);
    const regular = regularResponse.body as Array<{
      id: string;
      dates: Array<{ recurrenceRule: string | null }>;
    }>;
    const recurringActivity = regular.find(({ id }) => id === activity.id);
    expect(recurringActivity).toBeDefined();
    expect(recurringActivity?.dates[0]?.recurrenceRule).toContain('INTERVAL=2');
  });

  it('GET /api/v1/health reports a healthy database', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({
        status: 'ok',
        info: {
          database: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
        },
      });
  });

  it('GET /api/docs-json exposes the OpenAPI document', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200)
      .expect('Content-Type', /json/);
    const document = response.body as {
      info?: { title?: string };
      paths?: Record<string, unknown>;
      components?: {
        schemas?: Record<
          string,
          { properties?: Record<string, { type?: string; nullable?: boolean }> }
        >;
      };
    };

    expect(document.info?.title).toBe('The Tron Loop API');
    expect(document.paths).toHaveProperty('/api/v1/admin/activities');
    expect(document.paths).not.toHaveProperty('/api/v1/activities/{slug}');
    expect(
      document.components?.schemas?.CreateActivityDto.properties?.summary,
    ).toEqual(expect.objectContaining({ type: 'string', nullable: true }));
  });

  it('GET / does not expose the removed starter endpoint', () => {
    return request(app.getHttpServer()).get('/').expect(404);
  });

  describe('activity lifecycle', () => {
    const uniquePart = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const activityTitle = `E2E Activity ${uniquePart}`;
    const publicRange = {
      from: '2026-08-14T00:00:00+12:00',
      to: '2026-08-17T00:00:00+12:00',
    };
    let activityId: string;
    let laterActivityId: string;
    let venueId: string;
    let tagId: string;
    let tagSlug: string;

    it('creates supporting venue and tag records', async () => {
      const venueResponse = await adminAgent
        .post('/api/v1/admin/venues')
        .send({
          name: `E2E Venue ${uniquePart}`,
          address: '1 Victoria Street',
          suburb: 'Hamilton East',
          latitude: -37.7909,
          longitude: 175.2845,
        })
        .expect(201);
      const venue = venueResponse.body as { id: string; city: string };
      venueId = venue.id;
      venueIds.push(venueId);
      expect(venue.city).toBe('Hamilton');

      const tagResponse = await adminAgent
        .post('/api/v1/admin/tags')
        .send({ name: `E2E Family ${uniquePart}` })
        .expect(201);
      const tag = tagResponse.body as { id: string; slug: string };
      tagId = tag.id;
      tagSlug = tag.slug;
      tagIds.push(tagId);
      expect(tag.slug).toContain('e2e-family');
    });

    it('rejects an activity whose end time is before its start time', () => {
      return adminAgent
        .post('/api/v1/admin/activities')
        .send({
          title: `Invalid ${uniquePart}`,
          description: 'Invalid date range',
          dates: [
            {
              startsAt: '2026-08-14T21:00:00+12:00',
              endsAt: '2026-08-14T18:00:00+12:00',
            },
          ],
        })
        .expect(400);
    });

    it('rejects an activity whose end time equals its start time', () => {
      return adminAgent
        .post('/api/v1/admin/activities')
        .send({
          title: `Zero duration ${uniquePart}`,
          description: 'Invalid zero-duration activity',
          dates: [
            {
              startsAt: '2026-08-14T18:00:00+12:00',
              endsAt: '2026-08-14T18:00:00+12:00',
            },
          ],
        })
        .expect(400);
    });

    it('rejects an activity with a whitespace-only title', () => {
      return adminAgent
        .post('/api/v1/admin/activities')
        .send({
          title: '   ',
          description: 'Invalid title',
          dates: [{ startsAt: '2026-08-14T18:00:00+12:00' }],
        })
        .expect(400);
    });

    it('rejects an activity that references a missing venue', () => {
      return adminAgent
        .post('/api/v1/admin/activities')
        .send({
          title: `Missing Venue ${uniquePart}`,
          description: 'Invalid venue reference',
          venueId: '00000000-0000-4000-8000-000000000001',
          dates: [{ startsAt: '2026-08-14T18:00:00+12:00' }],
        })
        .expect(400);
    });

    it('rejects the removed koha cost type', () => {
      return adminAgent
        .post('/api/v1/admin/activities')
        .send({
          title: `Koha ${uniquePart}`,
          description: 'Removed cost type',
          costType: 'koha',
          dates: [{ startsAt: '2026-08-14T18:00:00+12:00' }],
        })
        .expect(400);
    });

    it('creates a draft activity with dates, venue and tags', async () => {
      const response = await adminAgent
        .post('/api/v1/admin/activities')
        .send({
          title: activityTitle,
          summary: 'Initial summary',
          description: 'Created by the activity lifecycle E2E test',
          imageUrl: '/images/activities/event-triptych.png',
          environment: 'indoor',
          costType: 'free',
          venueId,
          tagIds: [tagId],
          dates: [
            {
              startsAt: '2026-08-14T18:00:00+12:00',
              endsAt: '2026-08-14T21:00:00+12:00',
            },
            {
              startsAt: '2026-08-16T10:00:00+12:00',
              endsAt: '2026-08-16T12:00:00+12:00',
            },
          ],
        })
        .expect(201);
      const activity = response.body as {
        id: string;
        slug: string;
        status: string;
        imageUrl: string;
        environment: string;
        venue: { id: string };
        tags: Array<{ id: string }>;
        dates: Array<{ timezone: string }>;
      };

      activityId = activity.id;
      activityIds.push(activityId);
      expect(activity.status).toBe('draft');
      expect(activity.imageUrl).toBe('/images/activities/event-triptych.png');
      expect(activity.environment).toBe('indoor');
      expect(activity.venue.id).toBe(venueId);
      expect(activity.tags).toEqual([expect.objectContaining({ id: tagId })]);
      expect(activity.dates[0].timezone).toBe('Pacific/Auckland');
    });

    it('does not expose a draft through the public API', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/activities')
        .query({ ...publicRange, tag: tagSlug })
        .expect(200);
      const page = response.body as { items: Array<{ id: string }> };

      expect(page.items).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: activityId })]),
      );
    });

    it('rejects a duplicate activity slug', () => {
      return adminAgent
        .post('/api/v1/admin/activities')
        .send({
          title: activityTitle,
          description: 'Duplicate slug',
          dates: [{ startsAt: '2026-08-15T18:00:00+12:00' }],
        })
        .expect(409);
    });

    it('partially updates the draft and replaces its tags', async () => {
      const response = await adminAgent
        .patch(`/api/v1/admin/activities/${activityId}`)
        .send({ summary: 'Updated summary', tagIds: [] })
        .expect(200);
      const activity = response.body as {
        summary: string;
        slug: string;
        tags: unknown[];
      };

      expect(activity.summary).toBe('Updated summary');
      expect(activity.slug).toContain('e2e-activity');
      expect(activity.tags).toEqual([]);
    });

    it('publishes activities used by the public query tests', async () => {
      await adminAgent
        .patch(`/api/v1/admin/activities/${activityId}`)
        .send({ tagIds: [tagId] })
        .expect(200);

      const publishResponse = await adminAgent
        .post(`/api/v1/admin/activities/${activityId}/publish`)
        .expect(200);
      const published = publishResponse.body as {
        status: string;
        publishedAt: string | null;
      };
      expect(published.status).toBe('published');
      expect(published.publishedAt).not.toBeNull();

      const laterResponse = await adminAgent
        .post('/api/v1/admin/activities')
        .send({
          title: `Later E2E Activity ${uniquePart}`,
          description: 'Used to verify public ordering',
          costType: 'paid',
          dates: [{ startsAt: '2026-08-15T10:00:00+12:00' }],
        })
        .expect(201);
      laterActivityId = (laterResponse.body as { id: string }).id;
      activityIds.push(laterActivityId);
      await adminAgent
        .post(`/api/v1/admin/activities/${laterActivityId}/publish`)
        .expect(200);
    });

    it('filters, de-duplicates and orders public activities by matching dates', async () => {
      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/activities')
        .query({
          from: '2026-08-14T00:00:00+12:00',
          to: '2026-08-17T00:00:00+12:00',
          page: 1,
          limit: 100,
        })
        .expect(200);
      const page = listResponse.body as {
        items: Array<{ id: string; dates: unknown[] }>;
        totalPages: number;
      };
      const testActivityIds = page.items
        .filter((activity) =>
          [activityId, laterActivityId].includes(activity.id),
        )
        .map((activity) => activity.id);

      expect(testActivityIds).toEqual([activityId, laterActivityId]);
      expect(testActivityIds.filter((id) => id === activityId)).toHaveLength(1);
      expect(
        page.items.find((activity) => activity.id === activityId)?.dates,
      ).toHaveLength(2);
      expect(page.totalPages).toBeGreaterThanOrEqual(1);

      const firstOccurrenceOnly = await request(app.getHttpServer())
        .get('/api/v1/activities')
        .query({
          from: '2026-08-14T18:00:00+12:00',
          to: '2026-08-14T19:00:00+12:00',
        })
        .expect(200);
      const narrowPage = firstOccurrenceOnly.body as {
        items: Array<{ id: string; dates: unknown[] }>;
      };
      expect(
        narrowPage.items.find((activity) => activity.id === activityId)?.dates,
      ).toHaveLength(1);

      const exclusiveBoundary = await request(app.getHttpServer())
        .get('/api/v1/activities')
        .query({
          from: '2026-08-14T00:00:00+12:00',
          to: '2026-08-14T18:00:00+12:00',
        })
        .expect(200);
      expect(
        (exclusiveBoundary.body as { items: Array<{ id: string }> }).items,
      ).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: activityId })]),
      );
    });

    it('searches public activities and supports descending date order', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/activities')
        .query({ ...publicRange, q: 'e2e activity', sort: 'desc' })
        .expect(200);
      const page = response.body as {
        items: Array<{ id: string; dates: Array<{ startsAt: string }> }>;
      };

      expect(page.items.map(({ id }) => id)).toEqual([
        laterActivityId,
        activityId,
      ]);
      expect(page.items[0].dates[0].startsAt).toBe('2026-08-14T22:00:00.000Z');
    });

    it('sorts by distance before pagination and places missing coordinates last', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/activities')
        .query({
          ...publicRange,
          sortBy: 'distance',
          latitude: -37.791,
          longitude: 175.284,
        })
        .expect(200);
      const page = response.body as {
        items: Array<{ id: string; distanceKm?: number }>;
      };
      const first = page.items.findIndex(({ id }) => id === activityId);
      const withoutCoordinates = page.items.findIndex(
        ({ id }) => id === laterActivityId,
      );
      expect(first).toBeGreaterThanOrEqual(0);
      expect(withoutCoordinates).toBeGreaterThan(first);
      expect(page.items[first].distanceKm).toBeGreaterThanOrEqual(0);
      expect(page.items[withoutCoordinates].distanceKm).toBeUndefined();
    });

    it('requires coordinates for distance sorting', () => {
      return request(app.getHttpServer())
        .get('/api/v1/activities')
        .query({ ...publicRange, sortBy: 'distance' })
        .expect(400);
    });

    it('returns filter options used by public activities', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/activities/filters')
        .query(publicRange)
        .expect(200);
      const options = response.body as {
        costTypes: string[];
        tags: Array<{ name: string; slug: string }>;
        suburbs: string[];
      };

      expect(options.costTypes).toEqual(['free', 'paid', 'unknown']);
      expect(options.tags).toEqual(
        expect.arrayContaining([expect.objectContaining({ slug: tagSlug })]),
      );
      expect(options.suburbs).toContain('Hamilton East');
    });

    it('supports cost, tag and case-insensitive suburb filters', async () => {
      const freeResponse = await request(app.getHttpServer())
        .get('/api/v1/activities')
        .query({
          ...publicRange,
          costType: 'free',
          tag: tagSlug,
          suburb: 'hamilton east',
        })
        .expect(200);
      const freeItems = (freeResponse.body as { items: Array<{ id: string }> })
        .items;
      expect(freeItems).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: activityId })]),
      );
      expect(freeItems).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: laterActivityId }),
        ]),
      );

      const paidResponse = await request(app.getHttpServer())
        .get('/api/v1/activities')
        .query({ ...publicRange, costType: 'paid' })
        .expect(200);
      expect(
        (paidResponse.body as { items: Array<{ id: string }> }).items,
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: laterActivityId }),
        ]),
      );
    });

    it('returns explainable recommendations for a confirmed intent', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/discovery/recommendations')
        .send({
          intent: {
            date: '2026-08-14',
            availableFrom: '17:00',
            availableTo: '22:00',
            timezone: 'Pacific/Auckland',
            required: { environment: 'indoor', freeOnly: true },
            preferred: { free: true, interests: [], suburb: 'Hamilton East' },
            targetActivityCount: 2,
            travelMode: 'driving',
          },
        })
        .expect(200);
      const body = response.body as {
        items: Array<{
          activity: { id: string };
          score: number;
          reasons: Array<{ code: string }>;
        }>;
      };

      const recommended = body.items.find(
        (item) => item.activity.id === activityId,
      );
      expect(recommended?.score).toBe(100);
      expect(recommended?.reasons.map(({ code }) => code)).toEqual(
        expect.arrayContaining(['FREE', 'PREFERRED_SUBURB']),
      );
    });

    it('keeps useful local search conditions when Gemini is not configured', async () => {
      const config = app.get(ConfigService);
      const originalKey = config.get<string>('GEMINI_API_KEY');
      config.set('GEMINI_API_KEY', '');
      try {
        const response = await request(app.getHttpServer())
          .post('/api/v1/discovery/parse')
          .send({
            text: 'Free family activities on Saturday afternoon',
            referenceTime: '2026-08-10T10:00:00+12:00',
            timezone: 'Pacific/Auckland',
          })
          .expect(200);

        const body = response.body as {
          intent: Record<string, unknown> | null;
          source: string;
          manualEntryRequired: boolean;
        };
        expect(body.intent).toEqual(
          expect.objectContaining({
            date: '2026-08-15',
            availableFrom: '12:00',
            availableTo: '17:00',
            required: {
              familyFriendly: true,
              freeOnly: true,
            },
            preferred: { interests: [] },
          }),
        );
        expect(body.source).toBe('manual');
        expect(body.manualEntryRequired).toBe(false);
      } finally {
        config.set('GEMINI_API_KEY', originalKey);
      }
    });

    it('rejects an invalid public date range', () => {
      return request(app.getHttpServer())
        .get('/api/v1/activities')
        .query({
          from: '2026-08-17T00:00:00+12:00',
          to: '2026-08-10T00:00:00+12:00',
        })
        .expect(400);
    });

    it('requires a public date range and limits it to one week', async () => {
      await request(app.getHttpServer()).get('/api/v1/activities').expect(400);

      await request(app.getHttpServer())
        .get('/api/v1/activities')
        .query({
          from: '2026-08-01T00:00:00+12:00',
          to: '2026-08-10T00:00:00+12:00',
        })
        .expect(400);
    });

    it('moves a cancelled activity into its separate public view', async () => {
      const cancelResponse = await adminAgent
        .post(`/api/v1/admin/activities/${activityId}/cancel`)
        .expect(200);
      const cancelled = cancelResponse.body as {
        status: string;
        cancelledAt: string | null;
      };
      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.cancelledAt).not.toBeNull();

      const publicResponse = await request(app.getHttpServer())
        .get('/api/v1/activities')
        .query({ ...publicRange, tag: tagSlug })
        .expect(200);
      expect(
        (
          publicResponse.body as {
            items: Array<{ id: string; status: string }>;
          }
        ).items,
      ).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: activityId })]),
      );

      const cancelledResponse = await request(app.getHttpServer())
        .get('/api/v1/activities')
        .query({ ...publicRange, status: 'cancelled', tag: tagSlug })
        .expect(200);
      expect(
        (
          cancelledResponse.body as {
            items: Array<{ id: string; status: string }>;
          }
        ).items,
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: activityId, status: 'cancelled' }),
        ]),
      );

      await request(app.getHttpServer())
        .get('/api/v1/activities')
        .query({ ...publicRange, status: 'draft' })
        .expect(400);

      await adminAgent
        .delete(`/api/v1/admin/activities/${activityId}`)
        .expect(409);
    });

    it('deletes a separate draft activity', async () => {
      const createResponse = await adminAgent
        .post('/api/v1/admin/activities')
        .send({
          title: `Deletable Draft ${uniquePart}`,
          description: 'This draft will be deleted',
          dates: [{ startsAt: '2026-08-16T18:00:00+12:00' }],
        })
        .expect(201);
      const draft = createResponse.body as { id: string };
      activityIds.push(draft.id);

      await adminAgent
        .delete(`/api/v1/admin/activities/${draft.id}`)
        .expect(204);

      await adminAgent.get(`/api/v1/admin/activities/${draft.id}`).expect(404);
    });
  });

  afterAll(async () => {
    if (app) {
      if (activityIds.length) {
        await dataSource.getRepository(Activity).delete({
          id: In(activityIds),
        });
      }
      if (venueIds.length) {
        await dataSource.getRepository(Venue).delete({ id: In(venueIds) });
      }
      if (tagIds.length) {
        await dataSource.getRepository(Tag).delete({ id: In(tagIds) });
      }
      if (sourceIds.length) {
        await dataSource.getRepository(Source).delete({ id: In(sourceIds) });
      }
      await dataSource
        .getRepository(Venue)
        .delete({ name: 'Imported E2E Venue' });
      await dataSource.getRepository(Tag).delete({ slug: 'imported' });
      if (adminUserId) {
        await dataSource.getRepository(AdminSession).delete({ adminUserId });
        await dataSource.getRepository(AdminUser).delete(adminUserId);
      }
      await app.close();
      await new Promise<void>((resolve, reject) => {
        feedServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
