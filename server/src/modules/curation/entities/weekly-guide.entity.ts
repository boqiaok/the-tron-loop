import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WeeklyGuideStatus } from '../enums/weekly-guide-status.enum';
import { WeeklyGuideItem } from './weekly-guide-item.entity';

/** The editor's picks for one Monday-to-Sunday week in Pacific/Auckland. */
@Entity({ name: 'weekly_guides' })
@Index('UQ_weekly_guides_week_start', ['weekStart'], { unique: true })
@Check(
  'CHK_weekly_guides_week_start_monday',
  'EXTRACT(ISODOW FROM "week_start") = 1',
)
@Check(
  'CHK_weekly_guides_published_at',
  `("status" = 'published') = ("published_at" IS NOT NULL)`,
)
export class WeeklyGuide {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** A local calendar date, kept as text to avoid timezone conversion. */
  @Column({ name: 'week_start', type: 'date' })
  weekStart!: string;

  @Column({
    type: 'enum',
    enum: WeeklyGuideStatus,
    enumName: 'weekly_guide_status',
    default: WeeklyGuideStatus.Draft,
  })
  status!: WeeklyGuideStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  intro!: string | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @OneToMany(() => WeeklyGuideItem, (item) => item.guide)
  items!: WeeklyGuideItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
