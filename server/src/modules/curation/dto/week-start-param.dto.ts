import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class WeekStartParamDto {
  @ApiProperty({
    example: '2026-09-28',
    description: 'The Monday that starts the week, in Pacific/Auckland',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  weekStart!: string;
}
