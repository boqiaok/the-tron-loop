import { ApiProperty } from '@nestjs/swagger';
import { ActivityCostType } from '../enums/activity-cost-type.enum';

export class PublicTagOptionDto {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class ActivityFilterOptionsResponseDto {
  @ApiProperty({ enum: ActivityCostType, isArray: true })
  costTypes!: ActivityCostType[];

  @ApiProperty({ type: [PublicTagOptionDto] })
  tags!: PublicTagOptionDto[];

  @ApiProperty({ type: [String] })
  suburbs!: string[];
}
