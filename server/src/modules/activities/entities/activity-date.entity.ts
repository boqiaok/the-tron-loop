import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Activity } from './activity.entity';

@Entity({ name: 'activity_dates' })
@Index('IDX_activity_dates_starts_at', ['startsAt'])
@Index('UQ_activity_dates_activity_starts_at', ['activityId', 'startsAt'], {
  unique: true,
})
@Check(
  'CHK_activity_dates_end_after_start',
  '"ends_at" IS NULL OR "ends_at" >= "starts_at"',
)
export class ActivityDate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'activity_id', type: 'uuid' })
  activityId!: string;

  @ManyToOne(() => Activity, (activity) => activity.dates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'activity_id' })
  activity!: Activity;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt!: Date | null;

  @Column({ type: 'varchar', length: 64, default: 'Pacific/Auckland' })
  timezone!: string;

  @Column({ name: 'is_all_day', type: 'boolean', default: false })
  isAllDay!: boolean;

  @Column({ name: 'recurrence_rule', type: 'text', nullable: true })
  recurrenceRule!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
