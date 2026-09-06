import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { ADMIN_SESSION_DAYS } from './auth.constants';
import { AdminSession } from './entities/admin-session.entity';
import { AdminUser } from './entities/admin-user.entity';
import { hashPassword, verifyPassword } from './password';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

interface LoginAttempt {
  count: number;
  resetAt: number;
}

@Injectable()
export class AuthService {
  private readonly attempts = new Map<string, LoginAttempt>();

  constructor(
    @InjectRepository(AdminUser)
    private readonly adminUsers: Repository<AdminUser>,
    @InjectRepository(AdminSession)
    private readonly adminSessions: Repository<AdminSession>,
  ) {}

  async login(email: string, password: string, clientKey: string) {
    const normalizedEmail = normalizeEmail(email);
    const attemptKey = `${clientKey}:${normalizedEmail}`;
    this.assertLoginAllowed(attemptKey);

    const user = await this.adminUsers.findOneBy({ email: normalizedEmail });
    const valid = user
      ? await verifyPassword(password, user.passwordHash)
      : await verifyPassword(
          password,
          'scrypt$00000000000000000000000000000000$00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
        );

    if (!user || !user.isActive || !valid) {
      this.recordFailedLogin(attemptKey);
      throw new UnauthorizedException('Invalid email or password');
    }

    this.attempts.delete(attemptKey);
    await this.adminSessions.delete({ expiresAt: LessThan(new Date()) });

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(
      Date.now() + ADMIN_SESSION_DAYS * 24 * 60 * 60 * 1000,
    );
    await this.adminSessions.save(
      this.adminSessions.create({
        adminUserId: user.id,
        tokenHash: hashSessionToken(token),
        expiresAt,
      }),
    );

    return { token, expiresAt, user };
  }

  async findSessionUser(token: string): Promise<AdminUser | null> {
    const session = await this.adminSessions.findOne({
      where: { tokenHash: hashSessionToken(token) },
      relations: { adminUser: true },
    });

    if (!session) return null;
    if (session.expiresAt <= new Date() || !session.adminUser.isActive) {
      await this.adminSessions.delete(session.id);
      return null;
    }

    return session.adminUser;
  }

  async logout(token: string | undefined): Promise<void> {
    if (token) {
      await this.adminSessions.delete({ tokenHash: hashSessionToken(token) });
    }
  }

  async createAdmin(email: string, password: string): Promise<AdminUser> {
    const normalizedEmail = normalizeEmail(email);
    if (password.length < 12) {
      throw new Error('ADMIN_PASSWORD must contain at least 12 characters');
    }
    if (await this.adminUsers.existsBy({ email: normalizedEmail })) {
      throw new ConflictException('An administrator with this email exists');
    }

    return this.adminUsers.save(
      this.adminUsers.create({
        email: normalizedEmail,
        passwordHash: await hashPassword(password),
        isActive: true,
      }),
    );
  }

  private assertLoginAllowed(key: string): void {
    const attempt = this.attempts.get(key);
    if (!attempt) return;
    if (attempt.resetAt <= Date.now()) {
      this.attempts.delete(key);
      return;
    }
    if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
      throw new HttpException(
        'Too many login attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordFailedLogin(key: string): void {
    const current = this.attempts.get(key);
    if (!current || current.resetAt <= Date.now()) {
      this.attempts.set(key, {
        count: 1,
        resetAt: Date.now() + LOGIN_WINDOW_MS,
      });
      return;
    }
    current.count += 1;
  }
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
