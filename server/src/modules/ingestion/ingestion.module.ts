import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesModule } from '../activities/activities.module';
import { Activity } from '../activities/entities/activity.entity';
import { Tag } from '../activities/entities/tag.entity';
import { Venue } from '../activities/entities/venue.entity';
import { AuthModule } from '../auth/auth.module';
import { ImportItem } from './entities/import-item.entity';
import { ImportRun } from './entities/import-run.entity';
import { Source } from './entities/source.entity';
import { IngestionController } from './ingestion.controller';
import { IngestionScheduler } from './ingestion.scheduler';
import { IngestionService } from './ingestion.service';
import { EventfindaAdapter } from './eventfinda.adapter';
import { JsonFeedAdapter } from './json-feed.adapter';

@Module({
  imports: [
    AuthModule,
    ActivitiesModule,
    TypeOrmModule.forFeature([
      Source,
      ImportRun,
      ImportItem,
      Activity,
      Venue,
      Tag,
    ]),
  ],
  controllers: [IngestionController],
  providers: [
    IngestionService,
    IngestionScheduler,
    EventfindaAdapter,
    JsonFeedAdapter,
  ],
})
export class IngestionModule {}
