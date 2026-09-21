import { ActivityCostType } from '../activities/enums/activity-cost-type.enum';
import { ActivityEnvironment } from '../activities/enums/activity-environment.enum';
import { ActivityScheduleMode } from '../activities/enums/activity-schedule-mode.enum';
import { DurationSource } from '../activities/enums/duration-source.enum';
import { Source } from './entities/source.entity';

export interface ImportedActivityDate {
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  isAllDay: boolean;
}

export interface ImportedActivity {
  externalId: string;
  title: string;
  summary: string | null;
  description: string;
  imageUrl: string | null;
  environment?: ActivityEnvironment;
  scheduleMode?: ActivityScheduleMode;
  visitMinutes?: number | null;
  durationSource?: DurationSource;
  sourceUrl: string | null;
  dates: ImportedActivityDate[];
  venue: {
    name: string;
    address: string | null;
    suburb: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  tags: string[];
  costType: ActivityCostType;
  costAmountFrom: number | null;
  costDetails: string | null;
  isCancelled: boolean;
  raw: Record<string, unknown>;
}

export interface SourceAdapter {
  fetch(source: Source): Promise<Record<string, unknown>[]>;
  parse(raw: Record<string, unknown>): ImportedActivity;
}
