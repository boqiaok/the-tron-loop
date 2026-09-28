import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // The API is only reachable through the reverse proxy on the private network.
  app.set('trust proxy', 'loopback, uniquelocal');
  setupApp(app, configService);
  setupSwagger(app);

  await app.listen(configService.getOrThrow<number>('PORT'));
}
void bootstrap();
