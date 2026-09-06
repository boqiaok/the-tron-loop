import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSourceDto {
  @ApiProperty({ example: 'Hamilton events feed' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'https://example.com/events.json' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  feedUrl!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ default: 6, minimum: 1, maximum: 168 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  scheduleHours?: number;
}

export class UpdateSourceDto extends PartialType(CreateSourceDto) {}

export class SourceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'uri' })
  feedUrl!: string;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  scheduleHours!: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastRunAt!: string | null;
}

export class ImportRunResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  sourceId!: string;

  @ApiProperty()
  sourceName!: string;

  @ApiProperty({ enum: ['running', 'succeeded', 'failed'] })
  status!: string;

  @ApiProperty()
  createdCount!: number;

  @ApiProperty()
  updatedCount!: number;

  @ApiProperty()
  duplicateCount!: number;

  @ApiProperty()
  reviewCount!: number;

  @ApiProperty()
  failedCount!: number;

  @ApiProperty({ nullable: true })
  error!: string | null;

  @ApiProperty({ format: 'date-time' })
  startedAt!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  finishedAt!: string | null;
}
