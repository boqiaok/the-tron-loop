import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as Joi from 'joi';
import { ActivitiesModule } from './modules/activities/activities.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { MediaModule } from './modules/media/media.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { CurationModule } from './modules/curation/curation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().port().default(3001),
        DATABASE_URL: Joi.string()
          .uri({ scheme: ['postgres', 'postgresql'] })
          .required(),
        WEB_ORIGIN: Joi.string().uri().required(),
        PUBLIC_API_URL: Joi.string().uri().optional(),
        MEDIA_STORAGE_PATH: Joi.string().default('./media'),
        ADMIN_COOKIE_SECURE: Joi.boolean().default(false),
        IMPORTS_ENABLED: Joi.boolean().default(false),
        EVENTFINDA_USERNAME: Joi.string().optional(),
        EVENTFINDA_PASSWORD: Joi.string().optional(),
        GEMINI_API_KEY: Joi.string().trim().empty('').optional(),
        GEMINI_MODEL: Joi.string()
          .trim()
          .empty('')
          .default('gemini-3.5-flash-lite'),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: false,
        retryAttempts:
          configService.getOrThrow<string>('NODE_ENV') === 'test' ? 1 : 10,
        logging:
          configService.getOrThrow<string>('NODE_ENV') === 'development'
            ? ['error', 'warn', 'migration']
            : ['error'],
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    AuthModule,
    ActivitiesModule,
    MediaModule,
    IngestionModule,
    DiscoveryModule,
    CurationModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
