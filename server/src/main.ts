import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  setupApp(app, configService);
  setupSwagger(app);
  app.useStaticAssets(
    resolve(configService.get<string>('MEDIA_STORAGE_PATH') ?? './media'),
    { prefix: '/media/' },
  );

  await app.listen(configService.getOrThrow<number>('PORT'));
}
void bootstrap();
