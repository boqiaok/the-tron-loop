import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { AuthModule } from '../auth/auth.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [AuthModule],
  controllers: [MediaController],
  providers: [
    {
      provide: S3Client,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new S3Client({
          region: 'auto',
          endpoint: `https://${configService.getOrThrow<string>('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: configService.getOrThrow<string>('R2_ACCESS_KEY_ID'),
            secretAccessKey: configService.getOrThrow<string>(
              'R2_SECRET_ACCESS_KEY',
            ),
          },
        }),
    },
    MediaService,
  ],
})
export class MediaModule {}
