import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ActivityCategory } from '../enums/activity-category.enum';
import { ActivityCostType } from '../enums/activity-cost-type.enum';
import { ActivityEnvironment } from '../enums/activity-environment.enum';
import { ActivityStatus } from '../enums/activity-status.enum';
import { ActivityScheduleMode } from '../enums/activity-schedule-mode.enum';
import { DurationSource } from '../enums/duration-source.enum';
import { ActivityDate } from './activity-date.entity';
import { ActivityTag } from './activity-tag.entity';
import { Venue } from './venue.entity';
import { Source } from '../../ingestion/entities/source.entity';

@Entity({ name: 'activities' })
@Index('UQ_activities_slug', ['slug'], { unique: true })
@Index('IDX_activities_venue_id', ['venueId'])
@Index('IDX_activities_category', ['category'])
@Index('UQ_activities_source_external_id', ['sourceId', 'externalId'], {
  unique: true,
  where: '"source_id" IS NOT NULL AND "external_id" IS NOT NULL',
})
@Index('IDX_activities_import_fingerprint', ['importFingerprint'], {
  where: '"import_fingerprint" IS NOT NULL',
})
@Check(
  'CHK_activities_cost_amount_non_negative',
  '"cost_amount_from" IS NULL OR "cost_amount_from" >= 0',
)
@Check(
  'CHK_activities_visit_minutes_positive',
  '"visit_minutes" IS NULL OR "visit_minutes" BETWEEN 15 AND 720',
)
@Check(
  'CHK_activities_window_has_visit_minutes',
  '"schedule_mode" <> \'window\' OR "visit_minutes" IS NOT NULL',
)
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'varchar', length: 220 })
  slug!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  summary!: string | null;

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl!: string | null;

  @Column({
    type: 'enum',
    enum: ActivityCategory,
    enumName: 'activity_category',
    default: ActivityCategory.Community,
  })
  category!: ActivityCategory;

  @Column({
    type: 'enum',
    enum: ActivityEnvironment,
    enumName: 'activity_environment',
    default: ActivityEnvironment.Unknown,
  })
  environment!: ActivityEnvironment;

  @Column({
    name: 'schedule_mode',
    type: 'enum',
    enum: ActivityScheduleMode,
    enumName: 'activity_schedule_mode',
    default: ActivityScheduleMode.Fixed,
  })
  scheduleMode!: ActivityScheduleMode;

  @Column({ name: 'visit_minutes', type: 'smallint', nullable: true })
  visitMinutes!: number | null;

  @Column({
    name: 'duration_source',
    type: 'enum',
    enum: DurationSource,
    enumName: 'activity_duration_source',
    default: DurationSource.Source,
  })
  durationSource!: DurationSource;

  @Column({
    name: 'cost_type',
    type: 'enum',
    enum: ActivityCostType,
    enumName: 'activity_cost_type',
    default: ActivityCostType.Unknown,
  })
  costType!: ActivityCostType;

  @Column({
    name: 'cost_amount_from',
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  costAmountFrom!: string | null;

  @Column({ type: 'char', length: 3, default: 'NZD' })
  currency!: string;

  @Column({
    name: 'cost_details',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  costDetails!: string | null;

  @Column({ name: 'venue_id', type: 'uuid', nullable: true })
  venueId!: string | null;

  @ManyToOne(() => Venue, (venue) => venue.activities, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'venue_id' })
  venue!: Venue | null;

  @Column({ name: 'source_url', type: 'text', nullable: true })
  sourceUrl!: string | null;

  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId!: string | null;

  @ManyToOne(() => Source, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_id' })
  source!: Source | null;

  @Column({ name: 'external_id', type: 'varchar', length: 255, nullable: true })
  externalId!: string | null;

  @Column({
    name: 'import_fingerprint',
    type: 'char',
    length: 64,
    nullable: true,
  })
  importFingerprint!: string | null;

  @Column({
    type: 'enum',
    enum: ActivityStatus,
    enumName: 'activity_status',
    default: ActivityStatus.Draft,
  })
  status!: ActivityStatus;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @OneToMany(() => ActivityDate, (activityDate) => activityDate.activity)
  dates!: ActivityDate[];

  @OneToMany(() => ActivityTag, (activityTag) => activityTag.activity)
  activityTags!: ActivityTag[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
