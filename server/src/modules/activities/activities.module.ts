import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityDate } from './entities/activity-date.entity';
import { Activity } from './entities/activity.entity';
import { ActivityTag } from './entities/activity-tag.entity';
import { Tag } from './entities/tag.entity';
import { Venue } from './entities/venue.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Activity, ActivityDate, Venue, Tag, ActivityTag]),
  ],
  exports: [TypeOrmModule],
})
export class ActivitiesModule {}
