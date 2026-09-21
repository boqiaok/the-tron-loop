import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ActivityCategory } from '../enums/activity-category.enum';
import { ActivityCostType } from '../enums/activity-cost-type.enum';
import { ActivityStatus } from '../enums/activity-status.enum';

class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class ActivityRangeQueryDto {
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-08-10T00:00:00+12:00',
    description: 'Inclusive activity start-time boundary',
  })
  @IsISO8601({ strict: true })
  from!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-08-17T00:00:00+12:00',
    description: 'Exclusive activity start-time boundary',
  })
  @IsISO8601({ strict: true })
  to!: string;
}

export class ActivityPaginationQueryDto extends ActivityRangeQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ example: 'music', maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort = 'asc' as 'asc' | 'desc';

  @ApiPropertyOptional({ enum: ['date', 'distance'], default: 'date' })
  @IsOptional()
  @IsIn(['date', 'distance'])
  sortBy = 'date' as 'date' | 'distance';

  @ApiPropertyOptional({ minimum: -90, maximum: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ minimum: -180, maximum: 180 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    default: false,
    description: 'Also list cancelled activities alongside published ones',
  })
  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => value === true || value === 'true',
  )
  @IsBoolean()
  includeCancelled = false;

  @ApiPropertyOptional({
    default: false,
    description: 'Only occurrences starting at or after 17:00 local time',
  })
  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => value === true || value === 'true',
  )
  @IsBoolean()
  evening = false;

  @ApiPropertyOptional({
    enum: ActivityCategory,
    isArray: true,
    description: 'Comma-separated categories; matches any of them',
    example: 'workshop,family',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').filter(Boolean) : value,
  )
  @IsArray()
  @ArrayUnique()
  @IsEnum(ActivityCategory, { each: true })
  categories?: ActivityCategory[];

  @ApiPropertyOptional({ enum: ActivityCostType })
  @IsOptional()
  @IsEnum(ActivityCostType)
  costType?: ActivityCostType;

  @ApiPropertyOptional({ example: 'Hamilton East', maxLength: 120 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(120)
  suburb?: string;
}

export class AdminActivityQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ActivityStatus })
  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;
}
