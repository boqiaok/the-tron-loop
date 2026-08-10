import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityCostType } from '../enums/activity-cost-type.enum';
import { ActivityStatus } from '../enums/activity-status.enum';

export class VenueResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  address!: string | null;

  @ApiPropertyOptional({ nullable: true })
  suburb!: string | null;

  @ApiProperty()
  city!: string;

  @ApiPropertyOptional({ nullable: true })
  latitude!: number | null;

  @ApiPropertyOptional({ nullable: true })
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

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  endsAt!: string | null;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  isAllDay!: boolean;

  @ApiPropertyOptional({ nullable: true })
  recurrenceRule!: string | null;
}

export class ActivityResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional({ nullable: true })
  summary!: string | null;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional({ nullable: true })
  imageUrl!: string | null;

  @ApiProperty({ enum: ActivityCostType })
  costType!: ActivityCostType;

  @ApiPropertyOptional({ nullable: true })
  costAmountFrom!: number | null;

  @ApiProperty()
  currency!: string;

  @ApiPropertyOptional({ nullable: true })
  costDetails!: string | null;

  @ApiPropertyOptional({ type: VenueResponseDto, nullable: true })
  venue!: VenueResponseDto | null;

  @ApiPropertyOptional({ nullable: true })
  sourceUrl!: string | null;

  @ApiProperty({ enum: ActivityStatus })
  status!: ActivityStatus;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  publishedAt!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  cancelledAt!: string | null;

  @ApiProperty({ type: [ActivityDateResponseDto] })
  dates!: ActivityDateResponseDto[];

  @ApiProperty({ type: [TagResponseDto] })
  tags!: TagResponseDto[];

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
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
