import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from '../activities/entities/activity.entity';
import { ActivityDate } from '../activities/entities/activity-date.entity';
import { Tag } from '../activities/entities/tag.entity';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';
import { GeminiQuotaService } from './gemini-quota.service';
import { TopicRelevanceService } from './topic-relevance.service';

@Module({
  imports: [TypeOrmModule.forFeature([Activity, ActivityDate, Tag])],
  controllers: [DiscoveryController],
  providers: [DiscoveryService, GeminiQuotaService, TopicRelevanceService],
})
export class DiscoveryModule {}
