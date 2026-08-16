import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ActivityCostType } from '../enums/activity-cost-type.enum';
import { ActivityDateInputDto } from './activity-date-input.dto';

export class CreateActivityDto {
  @ApiProperty({ example: 'Hamilton Night Market', maxLength: 200 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    example: 'hamilton-night-market',
    maxLength: 220,
    description: 'Generated from the title when omitted',
  })
  @IsOptional()
  @IsString()
  @MaxLength(220)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @ApiPropertyOptional({ type: String, maxLength: 500, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string | null;

  @ApiProperty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiPropertyOptional({ type: String, format: 'uri', nullable: true })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  imageUrl?: string | null;

  @ApiPropertyOptional({ enum: ActivityCostType, default: 'unknown' })
  @IsOptional()
  @IsEnum(ActivityCostType)
  costType?: ActivityCostType;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    nullable: true,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costAmountFrom?: number | null;

  @ApiPropertyOptional({ default: 'NZD', example: 'NZD' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @ApiPropertyOptional({
    type: String,
    maxLength: 255,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  costDetails?: string | null;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  venueId?: string | null;

  @ApiPropertyOptional({ type: String, format: 'uri', nullable: true })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  sourceUrl?: string | null;

  @ApiProperty({ type: [ActivityDateInputDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ActivityDateInputDto)
  dates!: ActivityDateInputDto[];

  @ApiPropertyOptional({ type: [String], format: 'uuid', default: [] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  tagIds?: string[];
}
