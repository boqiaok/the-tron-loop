import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Activity } from './activity.entity';

@Entity({ name: 'venues' })
@Check(
  'CHK_venues_latitude',
  '"latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90)',
)
@Check(
  'CHK_venues_longitude',
  '"longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180)',
)
export class Venue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  suburb!: string | null;

  @Column({ type: 'varchar', length: 120, default: 'Hamilton' })
  city!: string;

  @Column({ type: 'double precision', nullable: true })
  latitude!: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude!: number | null;

  @OneToMany(() => Activity, (activity) => activity.venue)
  activities!: Activity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
