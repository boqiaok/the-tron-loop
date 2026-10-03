import { Module } from '@nestjs/common';
import { PublicCacheService } from './public-cache.service';
import { PublicCacheSubscriber } from './public-cache.subscriber';

@Module({
  providers: [PublicCacheService, PublicCacheSubscriber],
  exports: [PublicCacheService],
})
export class PublicCacheModule {}
