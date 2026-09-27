import { ApiProperty } from '@nestjs/swagger';
import { ActivityResponseDto } from '../../activities/dto/activity-response.dto';
import { QualityExclusion, QualityReason } from '../activity-quality';
import { WeeklyGuideStatus } from '../enums/weekly-guide-status.enum';

export class WeeklyGuideItemResponseDto {
  @ApiProperty({ type: () => ActivityResponseDto })
  activity!: ActivityResponseDto;

  @ApiProperty({ type: String, nullable: true })
  note!: string | null;
}

export class WeeklyGuideResponseDto {
  @ApiProperty({ example: '2026-09-28' })
  weekStart!: string;

  @ApiProperty({ enum: WeeklyGuideStatus })
  status!: WeeklyGuideStatus;

  @ApiProperty({ type: String, nullable: true })
  intro!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  publishedAt!: string | null;

  @ApiProperty({ type: [WeeklyGuideItemResponseDto] })
  items!: WeeklyGuideItemResponseDto[];
}

export class GuideCandidateResponseDto {
  @ApiProperty({ type: () => ActivityResponseDto })
  activity!: ActivityResponseDto;

  @ApiProperty({ minimum: 0, maximum: 100 })
  score!: number;

  @ApiProperty({ enum: QualityReason, isArray: true })
  reasons!: QualityReason[];

  @ApiProperty({ enum: QualityExclusion, nullable: true })
  exclusion!: QualityExclusion | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Listings this week that share the title, when repeated',
  })
  repeatedFormatCount!: number | null;

  @ApiProperty({ type: String, nullable: true })
  organizer!: string | null;

  @ApiProperty({ description: 'Chosen by the automatic suggestion' })
  suggested!: boolean;
}

export class AdminWeeklyGuideResponseDto {
  @ApiProperty({ example: '2026-09-28' })
  weekStart!: string;

  @ApiProperty({ type: () => WeeklyGuideResponseDto, nullable: true })
  guide!: WeeklyGuideResponseDto | null;

  @ApiProperty({
    type: [GuideCandidateResponseDto],
    description: 'Draft and published activities this week, best first',
  })
  candidates!: GuideCandidateResponseDto[];
}
