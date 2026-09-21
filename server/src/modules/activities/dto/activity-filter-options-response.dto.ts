import { ApiProperty } from '@nestjs/swagger';
import { ActivityCategory } from '../enums/activity-category.enum';

export class CategoryCountDto {
  @ApiProperty({ enum: ActivityCategory })
  category!: ActivityCategory;

  @ApiProperty()
  count!: number;
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
}
