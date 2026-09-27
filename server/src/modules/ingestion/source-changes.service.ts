import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { toAdminActivityResponse } from '../activities/activity.mapper';
import { Activity } from '../activities/entities/activity.entity';
import { ActivityStatus } from '../activities/enums/activity-status.enum';
import { ChangedActivityResponseDto } from './dto/source-change.dto';
import { diffSnapshots } from './source-snapshot';

@Injectable()
export class SourceChangesService {
  constructor(
    @InjectRepository(Activity)
    private readonly activities: Repository<Activity>,
  ) {}

  /** Published activities whose source changed since an editor accepted it. */
  async findPending(): Promise<ChangedActivityResponseDto[]> {
    const now = new Date();
    const activities = await this.activities.find({
      where: {
        status: ActivityStatus.Published,
        pendingSourceSnapshot: Not(IsNull()),
      },
      relations: {
        venue: true,
        dates: true,
        activityTags: { tag: true },
        source: true,
      },
      order: { updatedAt: 'DESC' },
    });

    return activities
      .map((activity) => ({
        activity: toAdminActivityResponse(activity),
        // Compared again now, so dates that have since passed drop out.
        changes: diffSnapshots(
          activity.sourceSnapshot!,
          activity.pendingSourceSnapshot!,
          now,
        ),
      }))
      .filter(({ changes }) => changes.length);
  }

  /** The editor has dealt with the changes: the source's listing is accepted. */
  async accept(activityId: string): Promise<void> {
    const activity = await this.activities.findOneBy({ id: activityId });
    if (!activity) {
      throw new NotFoundException(`Activity "${activityId}" was not found`);
    }
    if (!activity.pendingSourceSnapshot) {
      throw new ConflictException('This activity has no source changes');
    }
    await this.activities.update(activityId, {
      sourceSnapshot: activity.pendingSourceSnapshot,
      pendingSourceSnapshot: null,
    });
  }
}
