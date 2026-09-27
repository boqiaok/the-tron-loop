import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Activity } from '../../activities/entities/activity.entity';
import { WeeklyGuide } from './weekly-guide.entity';

@Entity({ name: 'weekly_guide_items' })
@Index('UQ_weekly_guide_items_guide_position', ['guideId', 'position'], {
  unique: true,
})
@Index('UQ_weekly_guide_items_guide_activity', ['guideId', 'activityId'], {
  unique: true,
})
@Index('IDX_weekly_guide_items_activity_id', ['activityId'])
@Check('CHK_weekly_guide_items_position', '"position" BETWEEN 1 AND 12')
export class WeeklyGuideItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'guide_id', type: 'uuid' })
  guideId!: string;

  @ManyToOne(() => WeeklyGuide, (guide) => guide.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'guide_id',
    foreignKeyConstraintName: 'FK_weekly_guide_items_guide',
  })
  guide!: WeeklyGuide;

  @Column({ name: 'activity_id', type: 'uuid' })
  activityId!: string;

  @ManyToOne(() => Activity, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'activity_id',
    foreignKeyConstraintName: 'FK_weekly_guide_items_activity',
  })
  activity!: Activity;

  @Column({ type: 'smallint' })
  position!: number;

  /** One line from the editor on why the activity is worth going to. */
  @Column({ type: 'varchar', length: 280, nullable: true })
  note!: string | null;
}
