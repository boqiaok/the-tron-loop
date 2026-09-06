import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSessionGuard } from './admin-session.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminSession } from './entities/admin-session.entity';
import { AdminUser } from './entities/admin-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AdminUser, AdminSession])],
  controllers: [AuthController],
  providers: [AuthService, AdminSessionGuard],
  exports: [AuthService, AdminSessionGuard],
})
export class AuthModule {}
