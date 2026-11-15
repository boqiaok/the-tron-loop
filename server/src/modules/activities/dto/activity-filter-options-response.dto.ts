import { ApiProperty } from '@nestjs/swagger';
import { ActivityCategory } from '../enums/activity-category.enum';

export class CategoryCountDto {
  @ApiProperty({ enum: ActivityCategory })
  category!: ActivityCategory;

  @ApiProperty()
  count!: number;
}

export class TierCountsDto {
  @ApiProperty({ description: 'One-off and short-run listings in the week' })
  highlights!: number;

  @ApiProperty({ description: 'Dated sessions that come back every week' })
  regular!: number;

  @ApiProperty({ description: 'Listings open on most days of the week' })
  exhibitions!: number;

  @ApiProperty({
    description:
      'Published activities with a weekly rule, listed with the weekly sessions',
  })
  recurring!: number;
}

export class ActivityFilterOptionsResponseDto {
  @ApiProperty({
    type: [CategoryCountDto],
    description: 'Published activity counts for every category in the range',
  })
  categories!: CategoryCountDto[];

  @ApiProperty({ type: [String] })
  suburbs!: string[];

  @ApiProperty({ description: 'Cancelled activities in the range' })
  cancelledCount!: number;

  @ApiProperty({
    type: TierCountsDto,
    description: 'Published listings in the range by listing tier',
  })
  tiers!: TierCountsDto;
}
