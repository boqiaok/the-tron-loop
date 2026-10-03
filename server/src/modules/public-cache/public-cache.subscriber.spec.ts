import { DataSource, EntityMetadata, QueryRunner } from 'typeorm';
import { Activity } from '../activities/entities/activity.entity';
import { AdminSession } from '../auth/entities/admin-session.entity';
import { WeeklyGuide } from '../curation/entities/weekly-guide.entity';
import { PublicCacheService } from './public-cache.service';
import { PublicCacheSubscriber } from './public-cache.subscriber';

describe('PublicCacheSubscriber', () => {
  let cache: PublicCacheService;
  let subscriber: PublicCacheSubscriber;

  beforeEach(() => {
    cache = new PublicCacheService();
    cache.set('/api/v1/activities', ['cached'], cache.currentGeneration);
    subscriber = new PublicCacheSubscriber(
      { subscribers: [] } as unknown as DataSource,
      cache,
    );
  });

  it('registers itself with the data source', () => {
    const dataSource = { subscribers: [] } as unknown as DataSource;
    const registered = new PublicCacheSubscriber(dataSource, cache);

    expect(dataSource.subscribers).toEqual([registered]);
  });

  it.each([Activity, WeeklyGuide])(
    'clears the cache when %p is written',
    (entity) => {
      subscriber.afterUpdate(event(entity, runner(false)));

      expect(cache.get('/api/v1/activities')).toBeUndefined();
    },
  );

  it('keeps the cache when an entity outside public listings is written', () => {
    subscriber.afterInsert(event(AdminSession, runner(false)));

    expect(cache.get('/api/v1/activities')).toEqual(['cached']);
  });

  it('clears the cache once a transaction commits', () => {
    const queryRunner = runner(true);
    subscriber.afterRemove(event(Activity, queryRunner));

    expect(cache.get('/api/v1/activities')).toEqual(['cached']);

    subscriber.afterTransactionCommit({ queryRunner } as never);
    expect(cache.get('/api/v1/activities')).toBeUndefined();
  });

  it('keeps the cache when a transaction rolls back', () => {
    const queryRunner = runner(true);
    subscriber.afterInsert(event(Activity, queryRunner));
    subscriber.afterTransactionRollback({ queryRunner } as never);
    subscriber.afterTransactionCommit({ queryRunner } as never);

    expect(cache.get('/api/v1/activities')).toEqual(['cached']);
  });
});

function runner(isTransactionActive: boolean): QueryRunner {
  return { isTransactionActive, data: {} } as QueryRunner;
}

function event(target: EntityMetadata['target'], queryRunner: QueryRunner) {
  return { metadata: { target }, queryRunner } as never;
}
