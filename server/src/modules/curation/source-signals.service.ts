import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportItem } from '../ingestion/entities/import-item.entity';
import {
  mergeSourceSignals,
  readSourceSignals,
  SourceSignals,
} from '../ingestion/source-signals';
import { SourceType } from '../ingestion/source-type.enum';

@Injectable()
export class SourceSignalsService {
  constructor(
    @InjectRepository(ImportItem)
    private readonly importItems: Repository<ImportItem>,
  ) {}

  /**
   * Signals from the most recent payload each source sent for an activity,
   * including sources whose listing was matched to it as a duplicate.
   */
  async findForActivities(
    activityIds: string[],
  ): Promise<Map<string, SourceSignals>> {
    if (!activityIds.length) return new Map();

    const rows = await this.importItems
      .createQueryBuilder('item')
      .innerJoin('item.source', 'source')
      .select('item.activityId', 'activityId')
      .addSelect('item.rawPayload', 'rawPayload')
      .addSelect('source.sourceType', 'sourceType')
      .distinctOn(['item.activity_id', 'item.source_id'])
      .where('item.activityId IN (:...activityIds)', { activityIds })
      .orderBy('item.activity_id', 'ASC')
      .addOrderBy('item.source_id', 'ASC')
      .addOrderBy('item.created_at', 'DESC')
      .getRawMany<{
        activityId: string;
        rawPayload: Record<string, unknown>;
        sourceType: SourceType;
      }>();

    const bySource = new Map<string, SourceSignals[]>();
    for (const row of rows) {
      bySource.set(row.activityId, [
        ...(bySource.get(row.activityId) ?? []),
        readSourceSignals(row.sourceType, row.rawPayload),
      ]);
    }
    return new Map(
      [...bySource].map(([activityId, signals]) => [
        activityId,
        mergeSourceSignals(signals),
      ]),
    );
  }
}
