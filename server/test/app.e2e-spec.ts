import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { setupApp } from './../src/app.setup';
import { setupSwagger } from './../src/swagger';

describe('Application (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app, app.get(ConfigService));
    setupSwagger(app);
    await app.init();
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
    const document = response.body as { info?: { title?: string } };

    expect(document.info?.title).toBe('The Tron Loop API');
  });

  it('GET / does not expose the removed starter endpoint', () => {
    return request(app.getHttpServer()).get('/').expect(404);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
});
