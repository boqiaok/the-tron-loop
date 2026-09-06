import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ADMIN_SESSION_COOKIE } from './auth.constants';
import { AuthService } from './auth.service';
import { AdminLoginDto, AdminSessionResponseDto } from './dto/admin-login.dto';
import { AdminSessionGuard, readCookie } from './admin-session.guard';

@ApiTags('admin authentication')
@Controller('auth/admin')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start an administrator session' })
  @ApiOkResponse({ type: AdminSessionResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(
    @Body() dto: AdminLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminSessionResponseDto> {
    const session = await this.authService.login(
      dto.email,
      dto.password,
      request.ip ?? request.socket.remoteAddress ?? 'unknown',
    );
    response.cookie(ADMIN_SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.configService.getOrThrow<boolean>('ADMIN_COOKIE_SECURE'),
      expires: session.expiresAt,
      path: '/',
    });
    return { id: session.user.id, email: session.user.email };
  }

  @Get('session')
  @ApiOperation({ summary: 'Read the current administrator session' })
  @ApiOkResponse({ type: AdminSessionResponseDto })
  @ApiUnauthorizedResponse({ description: 'Administrator login required' })
  async session(@Req() request: Request): Promise<AdminSessionResponseDto> {
    const token = readCookie(request.headers.cookie, ADMIN_SESSION_COOKIE);
    const user = token ? await this.authService.findSessionUser(token) : null;
    if (!user) throw new UnauthorizedException('Administrator login required');
    return { id: user.id, email: user.email };
  }

  @Post('logout')
  @UseGuards(AdminSessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End the current administrator session' })
  @ApiNoContentResponse()
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(
      readCookie(request.headers.cookie, ADMIN_SESSION_COOKIE),
    );
    response.clearCookie(ADMIN_SESSION_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.configService.getOrThrow<boolean>('ADMIN_COOKIE_SECURE'),
      path: '/',
    });
  }
}
