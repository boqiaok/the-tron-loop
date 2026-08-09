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
import { ActivityCostType } from '../enums/activity-cost-type.enum';
import { ActivityStatus } from '../enums/activity-status.enum';
import { ActivityDate } from './activity-date.entity';
import { ActivityTag } from './activity-tag.entity';
import { Venue } from './venue.entity';

@Entity({ name: 'activities' })
@Index('UQ_activities_slug', ['slug'], { unique: true })
@Index('IDX_activities_venue_id', ['venueId'])
@Check(
  'CHK_activities_cost_amount_non_negative',
  '"cost_amount_from" IS NULL OR "cost_amount_from" >= 0',
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
