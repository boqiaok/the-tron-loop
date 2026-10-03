import { Injectable } from '@nestjs/common';
import {
  DataSource,
  EntityMetadata,
  EntitySubscriberInterface,
  InsertEvent,
  QueryRunner,
  RemoveEvent,
  TransactionCommitEvent,
  TransactionRollbackEvent,
  UpdateEvent,
} from 'typeorm';
import { ActivityDate } from '../activities/entities/activity-date.entity';
import { ActivityTag } from '../activities/entities/activity-tag.entity';
import { Activity } from '../activities/entities/activity.entity';
import { Tag } from '../activities/entities/tag.entity';
import { Venue } from '../activities/entities/venue.entity';
import { WeeklyGuideItem } from '../curation/entities/weekly-guide-item.entity';
import { WeeklyGuide } from '../curation/entities/weekly-guide.entity';
import { PublicCacheService } from './public-cache.service';

/** Entities whose rows appear in public responses. */
const PUBLIC_ENTITIES = new Set<EntityMetadata['target']>([
  Activity,
  ActivityDate,
  ActivityTag,
  Tag,
  Venue,
  WeeklyGuide,
  WeeklyGuideItem,
]);
const PENDING_CLEAR = 'publicCachePendingClear';

/**
 * Discards cached public responses whenever this process writes a public
 * entity. Writes inside a transaction clear the cache once it commits, so a
 * request cannot cache data read before the commit.
 */
@Injectable()
export class PublicCacheSubscriber implements EntitySubscriberInterface {
  constructor(
    dataSource: DataSource,
    private readonly cache: PublicCacheService,
  ) {
    dataSource.subscribers.push(this);
  }

  afterInsert(event: InsertEvent<unknown>): void {
    this.changed(event.metadata, event.queryRunner);
  }

  afterUpdate(event: UpdateEvent<unknown>): void {
    this.changed(event.metadata, event.queryRunner);
  }

  afterRemove(event: RemoveEvent<unknown>): void {
    this.changed(event.metadata, event.queryRunner);
  }

  afterTransactionCommit(event: TransactionCommitEvent): void {
    if (!event.queryRunner.data[PENDING_CLEAR]) return;
    delete event.queryRunner.data[PENDING_CLEAR];
    this.cache.clear();
  }

  afterTransactionRollback(event: TransactionRollbackEvent): void {
    delete event.queryRunner.data[PENDING_CLEAR];
  }

  private changed(metadata: EntityMetadata, queryRunner: QueryRunner): void {
    if (!PUBLIC_ENTITIES.has(metadata.target)) return;
    if (queryRunner.isTransactionActive) {
      queryRunner.data[PENDING_CLEAR] = true;
    } else {
      this.cache.clear();
    }
  }
}
