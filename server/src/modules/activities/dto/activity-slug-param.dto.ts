import { ApiProperty } from '@nestjs/swagger';
import { Matches, MaxLength } from 'class-validator';

export class ActivitySlugParamDto {
  @ApiProperty({ example: 'hamilton-night-market', maxLength: 220 })
  @MaxLength(220)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;
}
