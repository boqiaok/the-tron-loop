import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AdminUser } from './admin-user.entity';

@Entity({ name: 'admin_sessions' })
@Index('UQ_admin_sessions_token_hash', ['tokenHash'], { unique: true })
@Index('IDX_admin_sessions_admin_user_id', ['adminUserId'])
@Index('IDX_admin_sessions_expires_at', ['expiresAt'])
export class AdminSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'admin_user_id', type: 'uuid' })
  adminUserId!: string;

  @ManyToOne(() => AdminUser, (adminUser) => adminUser.sessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'admin_user_id' })
  adminUser!: AdminUser;

  @Column({ name: 'token_hash', type: 'char', length: 64 })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
