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
    };

    expect(document.info?.title).toBe('The Tron Loop API');
    expect(document.paths).toHaveProperty('/api/v1/admin/activities');
    expect(document.paths).toHaveProperty('/api/v1/activities/{slug}');
  });

  it('GET / does not expose the removed starter endpoint', () => {
    return request(app.getHttpServer()).get('/').expect(404);
  });

  describe('activity lifecycle', () => {
    const uniquePart = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const activityTitle = `E2E Activity ${uniquePart}`;
    let activityId: string;
    let activitySlug: string;
    let venueId: string;
    let tagId: string;

    it('creates supporting venue and tag records', async () => {
      const venueResponse = await request(app.getHttpServer())
        .post('/api/v1/admin/venues')
        .send({
          name: `E2E Venue ${uniquePart}`,
          address: '1 Victoria Street',
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

    it('creates a draft activity with dates, venue and tags', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/admin/activities')
        .send({
          title: activityTitle,
          summary: 'Initial summary',
          description: 'Created by the activity lifecycle E2E test',
          costType: 'free',
          venueId,
          tagIds: [tagId],
          dates: [
            {
              startsAt: '2026-08-14T18:00:00+12:00',
              endsAt: '2026-08-14T21:00:00+12:00',
            },
          ],
        })
        .expect(201);
      const activity = response.body as {
        id: string;
        slug: string;
        status: string;
        venue: { id: string };
        tags: Array<{ id: string }>;
        dates: Array<{ timezone: string }>;
      };

      activityId = activity.id;
      activitySlug = activity.slug;
      activityIds.push(activityId);
      expect(activity.status).toBe('draft');
      expect(activity.venue.id).toBe(venueId);
      expect(activity.tags).toEqual([expect.objectContaining({ id: tagId })]);
      expect(activity.dates[0].timezone).toBe('Pacific/Auckland');
    });

    it('does not expose a draft through the public API', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/activities/${activitySlug}`)
        .expect(404);
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
      expect(activity.slug).toBe(activitySlug);
      expect(activity.tags).toEqual([]);
    });

    it('publishes the activity and exposes it publicly', async () => {
      const publishResponse = await request(app.getHttpServer())
        .post(`/api/v1/admin/activities/${activityId}/publish`)
        .expect(200);
      const published = publishResponse.body as {
        status: string;
        publishedAt: string | null;
      };
      expect(published.status).toBe('published');
      expect(published.publishedAt).not.toBeNull();

      const publicResponse = await request(app.getHttpServer())
        .get(`/api/v1/activities/${activitySlug}`)
        .expect(200);
      expect((publicResponse.body as { status: string }).status).toBe(
        'published',
      );

      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/activities?page=1&limit=100')
        .expect(200);
      const page = listResponse.body as {
        items: Array<{ id: string }>;
        totalPages: number;
      };
      expect(page.items).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: activityId })]),
      );
      expect(page.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('keeps a cancelled activity visible but prevents its deletion', async () => {
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
        .get(`/api/v1/activities/${activitySlug}`)
        .expect(200);
      expect((publicResponse.body as { status: string }).status).toBe(
        'cancelled',
      );

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
