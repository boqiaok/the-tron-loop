import {
  Column,
  Check,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ImportRun } from './import-run.entity';
import { Source } from './source.entity';
import { Activity } from '../../activities/entities/activity.entity';

export enum ImportItemOutcome {
  Created = 'created',
  Updated = 'updated',
  Duplicate = 'duplicate',
  ReviewRequired = 'review_required',
  Failed = 'failed',
}

@Entity({ name: 'import_items' })
@Index('IDX_import_items_run_id', ['runId'])
@Index('IDX_import_items_source_external_id', ['sourceId', 'externalId'])
@Index('IDX_import_items_fingerprint', ['fingerprint'])
@Check(
  'CHK_import_items_outcome',
  "\"outcome\" IN ('created', 'updated', 'duplicate', 'review_required', 'failed')",
)
export class ImportItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'run_id', type: 'uuid' })
  runId!: string;

  @ManyToOne(() => ImportRun, (run) => run.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'run_id' })
  run!: ImportRun;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId!: string;

  @ManyToOne(() => Source, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_id' })
  source!: Source;

  @Column({ name: 'external_id', type: 'varchar', length: 255 })
  externalId!: string;

  @Column({ type: 'char', length: 64 })
  fingerprint!: string;

  @Column({ name: 'activity_id', type: 'uuid', nullable: true })
  activityId!: string | null;

  @ManyToOne(() => Activity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'activity_id' })
  activity!: Activity | null;

  @Column({ type: 'varchar', length: 30 })
  outcome!: ImportItemOutcome;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({ name: 'raw_payload', type: 'jsonb' })
  rawPayload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
