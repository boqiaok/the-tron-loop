import { ActivityCostType } from '../activities/enums/activity-cost-type.enum';
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
  sourceUrl: string | null;
  dates: ImportedActivityDate[];
  venue: { name: string; address: string | null; suburb: string | null } | null;
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
