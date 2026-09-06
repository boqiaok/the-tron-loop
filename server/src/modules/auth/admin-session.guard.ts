import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { ADMIN_SESSION_COOKIE } from './auth.constants';
import { AuthService } from './auth.service';

@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    this.assertTrustedOrigin(request);

    const token = readCookie(request.headers.cookie, ADMIN_SESSION_COOKIE);
    if (!token) throw new UnauthorizedException('Administrator login required');

    const user = await this.authService.findSessionUser(token);
    if (!user) throw new UnauthorizedException('Administrator session expired');

    Object.assign(request, { adminUser: user });
    return true;
  }

  private assertTrustedOrigin(request: Request): void {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
    const origin = request.headers.origin;
    const nodeEnv = this.configService.getOrThrow<string>('NODE_ENV');
    if (!origin && nodeEnv === 'test') return;
    const publicApiUrl =
      this.configService.get<string>('PUBLIC_API_URL') ??
      `http://localhost:${this.configService.getOrThrow<number>('PORT')}`;
    const trustedOrigins = new Set([
      new URL(this.configService.getOrThrow<string>('WEB_ORIGIN')).origin,
      new URL(publicApiUrl).origin,
    ]);
    if (!origin || !trustedOrigins.has(origin)) {
      throw new ForbiddenException('Untrusted request origin');
    }
  }
}

export function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName === name) return decodeURIComponent(rawValue.join('='));
  }
  return undefined;
}
