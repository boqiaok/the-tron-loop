import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export const MAX_GUIDE_ITEMS = 12;

export class WeeklyGuideItemInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  activityId!: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 280 })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  note?: string | null;
}

export class SaveWeeklyGuideDto {
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  intro?: string | null;

  @ApiProperty({
    type: [WeeklyGuideItemInputDto],
    maxItems: MAX_GUIDE_ITEMS,
    description: 'Picks in display order',
  })
  @IsArray()
  @ArrayMaxSize(MAX_GUIDE_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => WeeklyGuideItemInputDto)
  items!: WeeklyGuideItemInputDto[];
}
