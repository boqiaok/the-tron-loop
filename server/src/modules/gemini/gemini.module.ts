import { Module } from '@nestjs/common';
import { GeminiQuotaService } from './gemini-quota.service';

/** The project's shared Gemini request budget. */
@Module({
  providers: [GeminiQuotaService],
  exports: [GeminiQuotaService],
})
export class GeminiModule {}
