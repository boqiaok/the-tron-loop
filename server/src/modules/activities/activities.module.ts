import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { AdminActivitiesController } from './admin-activities.controller';
import { ActivityDate } from './entities/activity-date.entity';
import { Activity } from './entities/activity.entity';
import { ActivityTag } from './entities/activity-tag.entity';
import { Tag } from './entities/tag.entity';
import { Venue } from './entities/venue.entity';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Activity, ActivityDate, Venue, Tag, ActivityTag]),
  ],
  controllers: [
    AdminActivitiesController,
    ActivitiesController,
    VenuesController,
    TagsController,
  ],
  providers: [ActivitiesService, VenuesService, TagsService],
})
export class ActivitiesModule {}
