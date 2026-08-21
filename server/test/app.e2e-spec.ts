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

describe('Application (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  const activityIds: string[] = [];
  const tagIds: string[] = [];
  const venueIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app, app.get(ConfigService));
    setupSwagger(app);
    await app.init();
    dataSource = app.get(DataSource);
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
      const venueResponse = await request(app.getHttpServer())
        .post('/api/v1/admin/venues')
        .send({
          name: `E2E Venue ${uniquePart}`,
          address: '1 Victoria Street',
          suburb: 'Hamilton East',
        })
        .expect(201);
      const venue = venueResponse.body as { id: string; city: string };
      venueId = venue.id;
      venueIds.push(venueId);
      expect(venue.city).toBe('Hamilton');

      const tagResponse = await request(app.getHttpServer())
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
      return request(app.getHttpServer())
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
      return request(app.getHttpServer())
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
      return request(app.getHttpServer())
        .post('/api/v1/admin/activities')
        .send({
          title: '   ',
          description: 'Invalid title',
          dates: [{ startsAt: '2026-08-14T18:00:00+12:00' }],
        })
        .expect(400);
    });

    it('rejects an activity that references a missing venue', () => {
      return request(app.getHttpServer())
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
      return request(app.getHttpServer())
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
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/activities')
        .send({
          title: activityTitle,
          summary: 'Initial summary',
          description: 'Created by the activity lifecycle E2E test',
          imageUrl: '/images/activities/event-triptych.png',
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
        venue: { id: string };
        tags: Array<{ id: string }>;
        dates: Array<{ timezone: string }>;
      };

      activityId = activity.id;
      activityIds.push(activityId);
      expect(activity.status).toBe('draft');
      expect(activity.imageUrl).toBe(
        '/images/activities/event-triptych.png',
      );
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
      return request(app.getHttpServer())
        .post('/api/v1/admin/activities')
        .send({
          title: activityTitle,
          description: 'Duplicate slug',
          dates: [{ startsAt: '2026-08-15T18:00:00+12:00' }],
        })
        .expect(409);
    });

    it('partially updates the draft and replaces its tags', async () => {
      const response = await request(app.getHttpServer())
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
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/activities/${activityId}`)
        .send({ tagIds: [tagId] })
        .expect(200);

      const publishResponse = await request(app.getHttpServer())
        .post(`/api/v1/admin/activities/${activityId}/publish`)
        .expect(200);
      const published = publishResponse.body as {
        status: string;
        publishedAt: string | null;
      };
      expect(published.status).toBe('published');
      expect(published.publishedAt).not.toBeNull();

      const laterResponse = await request(app.getHttpServer())
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
      await request(app.getHttpServer())
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
      const cancelResponse = await request(app.getHttpServer())
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

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/activities/${activityId}`)
        .expect(409);
    });

    it('deletes a separate draft activity', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/admin/activities')
        .send({
          title: `Deletable Draft ${uniquePart}`,
          description: 'This draft will be deleted',
          dates: [{ startsAt: '2026-08-16T18:00:00+12:00' }],
        })
        .expect(201);
      const draft = createResponse.body as { id: string };
      activityIds.push(draft.id);

      await request(app.getHttpServer())
        .delete(`/api/v1/admin/activities/${draft.id}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/api/v1/admin/activities/${draft.id}`)
        .expect(404);
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
      await app.close();
    }
  });
});
