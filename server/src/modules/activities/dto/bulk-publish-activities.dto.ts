import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';

export class BulkPublishActivitiesDto {
  @ApiProperty({ type: [String], format: 'uuid', minItems: 1, maxItems: 100 })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  ids!: string[];
}

export class SkippedActivityResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  reason!: string;
}

export class BulkPublishActivitiesResponseDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  published!: string[];

  @ApiProperty({ type: [SkippedActivityResponseDto] })
  skipped!: SkippedActivityResponseDto[];
}
