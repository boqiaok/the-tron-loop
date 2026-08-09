import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Activity } from './activity.entity';
import { Tag } from './tag.entity';

@Entity({ name: 'activity_tags' })
@Index('IDX_activity_tags_tag_id', ['tagId'])
export class ActivityTag {
  @PrimaryColumn({ name: 'activity_id', type: 'uuid' })
  activityId!: string;

  @PrimaryColumn({ name: 'tag_id', type: 'uuid' })
  tagId!: string;

  @ManyToOne(() => Activity, (activity) => activity.activityTags, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'activity_id' })
  activity!: Activity;

  @ManyToOne(() => Tag, (tag) => tag.activityTags, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tag_id' })
  tag!: Tag;
}
