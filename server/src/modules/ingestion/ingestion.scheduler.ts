import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActivityBlurbsService } from './activity-blurbs.service';
import { IngestionService } from './ingestion.service';

@Injectable()
export class IngestionScheduler
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(IngestionScheduler.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly ingestionService: IngestionService,
    private readonly activityBlurbs: ActivityBlurbsService,
    private readonly configService: ConfigService,
  ) {}

  async runDueImports(): Promise<void> {
    if (!this.configService.getOrThrow<boolean>('IMPORTS_ENABLED')) return;
    try {
      await this.ingestionService.importDueSources();
    } catch (error) {
      this.logger.error('Scheduled import failed', error);
    }
    // Drafted after imports so new listings get a blurb within the hour.
    try {
      await this.activityBlurbs.draftMissing();
    } catch (error) {
      this.logger.error('Drafting listing blurbs failed', error);
    }
  }

  onApplicationBootstrap(): void {
    if (!this.configService.getOrThrow<boolean>('IMPORTS_ENABLED')) return;
    this.timer = setInterval(() => void this.runDueImports(), 60 * 60 * 1000);
    this.timer.unref();
    void this.runDueImports();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
