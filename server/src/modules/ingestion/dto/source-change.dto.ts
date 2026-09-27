import { ApiProperty } from '@nestjs/swagger';
import { AdminActivityResponseDto } from '../../activities/dto/activity-response.dto';
import { SourceChangeKind } from '../source-snapshot';

export class SourceChangeResponseDto {
  @ApiProperty({ enum: SourceChangeKind })
  kind!: SourceChangeKind;

  @ApiProperty({ type: String, nullable: true })
  before!: string | null;

  @ApiProperty({ type: String, nullable: true })
  after!: string | null;

  @ApiProperty({
    type: [String],
    format: 'date-time',
    description: 'For removed dates, the start times no longer listed',
  })
  dates!: string[];
}

export class ChangedActivityResponseDto {
  @ApiProperty({ type: () => AdminActivityResponseDto })
  activity!: AdminActivityResponseDto;

  @ApiProperty({ type: [SourceChangeResponseDto] })
  changes!: SourceChangeResponseDto[];
}
