import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  IsTimeZone,
} from 'class-validator';

export class ActivityDateInputDto {
  @ApiProperty({ example: '2026-08-14T18:00:00+12:00' })
  @IsISO8601({ strict: true })
  startsAt!: string;

  @ApiPropertyOptional({
    type: String,
    example: '2026-08-14T21:00:00+12:00',
    format: 'date-time',
    nullable: true,
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  endsAt?: string | null;

  @ApiPropertyOptional({ default: 'Pacific/Auckland' })
  @IsOptional()
  @IsTimeZone()
  timezone?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  recurrenceRule?: string | null;
}
