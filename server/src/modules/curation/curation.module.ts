import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from '../activities/entities/activity.entity';
import { AuthModule } from '../auth/auth.module';
import { PublicCacheModule } from '../public-cache/public-cache.module';
import { ImportItem } from '../ingestion/entities/import-item.entity';
import { AdminActivityReviewController } from './admin-activity-review.controller';
import { ActivityReviewService } from './activity-review.service';
import { AdminWeeklyGuidesController } from './admin-weekly-guides.controller';
import { WeeklyGuideItem } from './entities/weekly-guide-item.entity';
import { WeeklyGuide } from './entities/weekly-guide.entity';
import { WeeklyGuidesController } from './weekly-guides.controller';
import { SourceSignalsService } from './source-signals.service';
import { WeeklyGuidesService } from './weekly-guides.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WeeklyGuide,
      WeeklyGuideItem,
      Activity,
      ImportItem,
    ]),
    AuthModule,
    PublicCacheModule,
  ],
  controllers: [
    AdminActivityReviewController,
    AdminWeeklyGuidesController,
    WeeklyGuidesController,
  ],
  providers: [ActivityReviewService, SourceSignalsService, WeeklyGuidesService],
})
export class CurationModule {}
