import { ApiProperty } from '@nestjs/swagger';
import { ActivityCategory } from '../enums/activity-category.enum';
import { ActivityCostType } from '../enums/activity-cost-type.enum';
import { ActivityEnvironment } from '../enums/activity-environment.enum';
import { ActivityScheduleMode } from '../enums/activity-schedule-mode.enum';
import { DurationSource } from '../enums/duration-source.enum';
import { ActivityStatus } from '../enums/activity-status.enum';

export class VenueResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  address!: string | null;

  @ApiProperty({ type: String, nullable: true })
  suburb!: string | null;

  @ApiProperty()
  city!: string;

  @ApiProperty({ type: Number, nullable: true })
  latitude!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  longitude!: number | null;
}

export class TagResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class ActivityDateResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date-time' })
  startsAt!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  endsAt!: string | null;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  isAllDay!: boolean;

  @ApiProperty({ type: String, nullable: true })
  recurrenceRule!: string | null;
}

export class ActivityResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ type: String, nullable: true })
  summary!: string | null;

  @ApiProperty()
  description!: string;

  @ApiProperty({ type: String, format: 'uri', nullable: true })
  imageUrl!: string | null;

  @ApiProperty({ enum: ActivityCategory })
  category!: ActivityCategory;

  @ApiProperty({ enum: ActivityEnvironment })
  environment!: ActivityEnvironment;

  @ApiProperty({ enum: ActivityScheduleMode })
  scheduleMode!: ActivityScheduleMode;

  @ApiProperty({ type: Number, nullable: true })
  visitMinutes!: number | null;

  @ApiProperty({ enum: DurationSource })
  durationSource!: DurationSource;

  @ApiProperty({ enum: ActivityCostType })
  costType!: ActivityCostType;

  @ApiProperty({ type: Number, nullable: true })
  costAmountFrom!: number | null;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ type: String, nullable: true })
  costDetails!: string | null;

  @ApiProperty({ type: () => VenueResponseDto, nullable: true })
  venue!: VenueResponseDto | null;

  @ApiProperty({ type: String, format: 'uri', nullable: true })
  sourceUrl!: string | null;

  @ApiProperty({ enum: ActivityStatus })
  status!: ActivityStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  cancelledAt!: string | null;

  @ApiProperty({ type: [ActivityDateResponseDto] })
  dates!: ActivityDateResponseDto[];

  @ApiProperty({ type: [TagResponseDto] })
  tags!: TagResponseDto[];

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ type: Number, nullable: true, required: false })
  distanceKm?: number | null;
}

export class PaginatedActivitiesResponseDto {
  @ApiProperty({ type: [ActivityResponseDto] })
  items!: ActivityResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}
