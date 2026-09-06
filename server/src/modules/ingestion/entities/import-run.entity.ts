import {
  Column,
  Check,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Source } from './source.entity';
import { ImportItem } from './import-item.entity';

export enum ImportRunStatus {
  Running = 'running',
  Succeeded = 'succeeded',
  Failed = 'failed',
}

@Entity({ name: 'import_runs' })
@Index('IDX_import_runs_source_started_at', ['sourceId', 'startedAt'])
@Check(
  'CHK_import_runs_status',
  "\"status\" IN ('running', 'succeeded', 'failed')",
)
export class ImportRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'source_id', type: 'uuid' })
  sourceId!: string;

  @ManyToOne(() => Source, (source) => source.runs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_id' })
  source!: Source;

  @Column({ type: 'varchar', length: 20 })
  status!: ImportRunStatus;

  @Column({ name: 'created_count', type: 'integer', default: 0 })
  createdCount!: number;

  @Column({ name: 'updated_count', type: 'integer', default: 0 })
  updatedCount!: number;

  @Column({ name: 'duplicate_count', type: 'integer', default: 0 })
  duplicateCount!: number;

  @Column({ name: 'review_count', type: 'integer', default: 0 })
  reviewCount!: number;

  @Column({ name: 'failed_count', type: 'integer', default: 0 })
  failedCount!: number;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;

  @OneToMany(() => ImportItem, (item) => item.run)
  items!: ImportItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
