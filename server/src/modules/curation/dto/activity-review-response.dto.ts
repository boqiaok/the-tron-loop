import { ApiProperty } from '@nestjs/swagger';
import { AdminActivityResponseDto } from '../../activities/dto/activity-response.dto';
import { RejectionReason } from '../../activities/enums/rejection-reason.enum';
import { ReviewGroup, ReviewReason } from '../activity-review';

export class ActivityReviewItemResponseDto {
  @ApiProperty({ type: () => AdminActivityResponseDto })
  activity!: AdminActivityResponseDto;

  @ApiProperty({ enum: ReviewGroup })
  group!: ReviewGroup;

  @ApiProperty({
    enum: ReviewReason,
    isArray: true,
    description: 'Skip reasons first, then risks, then recommending signals',
  })
  reasons!: ReviewReason[];

  @ApiProperty({
    enum: RejectionReason,
    nullable: true,
    description:
      'For a skipped draft, the rejection its first skip reason implies',
  })
  suggestedRejection!: RejectionReason | null;

  @ApiProperty({
    minimum: 0,
    maximum: 100,
    description: 'The weekly picks quality score, used to order each group',
  })
  score!: number;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'The activity this draft repeats',
  })
  duplicateOfId!: string | null;
}

export class ActivityReviewCountsResponseDto {
  @ApiProperty()
  recommended!: number;

  @ApiProperty()
  review!: number;

  @ApiProperty()
  skip!: number;
}

export class ActivityReviewResponseDto {
  @ApiProperty({ type: () => ActivityReviewCountsResponseDto })
  counts!: ActivityReviewCountsResponseDto;

  @ApiProperty({
    description: 'Drafts left out because every date has ended',
  })
  endedCount!: number;

  @ApiProperty({
    type: [ActivityReviewItemResponseDto],
    description:
      'Every draft that has not ended, grouped, best first within a group',
  })
  items!: ActivityReviewItemResponseDto[];
}
