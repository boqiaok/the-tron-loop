import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ActivityTag } from './activity-tag.entity';

@Entity({ name: 'tags' })
@Index('UQ_tags_slug', ['slug'], { unique: true })
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 80 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  slug!: string;

  @OneToMany(() => ActivityTag, (activityTag) => activityTag.tag)
  activityTags!: ActivityTag[];
}
