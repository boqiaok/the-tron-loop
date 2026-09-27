import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { RejectionReason } from '../enums/rejection-reason.enum';

export class BulkActivitiesDto {
  @ApiProperty({ type: [String], format: 'uuid', minItems: 1, maxItems: 100 })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  ids!: string[];
}

export class BulkRejectActivitiesDto extends BulkActivitiesDto {
  @ApiProperty({
    enum: RejectionReason,
    description: `Only ${RejectionReason.NotSuitable} teaches the review which titles and organizers to hold back`,
  })
  @IsEnum(RejectionReason)
  reason!: RejectionReason;
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

export class BulkRejectActivitiesResponseDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  rejected!: string[];

  @ApiProperty({ type: [SkippedActivityResponseDto] })
  skipped!: SkippedActivityResponseDto[];
}
