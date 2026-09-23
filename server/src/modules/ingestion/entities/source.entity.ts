import {
  Column,
  Check,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ImportRun } from './import-run.entity';
import { SourceType } from '../source-type.enum';

@Entity({ name: 'sources' })
@Index('UQ_sources_name', ['name'], { unique: true })
@Check(
  'CHK_sources_schedule_hours',
  '"schedule_hours" >= 1 AND "schedule_hours" <= 168',
)
@Check(
  'CHK_sources_source_type',
  "\"source_type\" IN ('json_feed', 'eventfinda', 'hamilton_libraries')",
)
export class Source {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ name: 'feed_url', type: 'text' })
  feedUrl!: string;

  @Column({
    name: 'source_type',
    type: 'varchar',
    length: 30,
    default: SourceType.JsonFeed,
  })
  sourceType!: SourceType;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ name: 'schedule_hours', type: 'smallint', default: 6 })
  scheduleHours!: number;

  @Column({ name: 'last_run_at', type: 'timestamptz', nullable: true })
  lastRunAt!: Date | null;

  @OneToMany(() => ImportRun, (run) => run.source)
  runs!: ImportRun[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
