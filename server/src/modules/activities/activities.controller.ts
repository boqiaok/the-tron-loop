import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { ActivityFilterOptionsResponseDto } from './dto/activity-filter-options-response.dto';
import { PaginatedActivitiesResponseDto } from './dto/activity-response.dto';
import {
  ActivityPaginationQueryDto,
  ActivityRangeQueryDto,
} from './dto/activity-query.dto';

@ApiTags('activities')
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get('filters')
  @ApiOperation({ summary: 'Get filter options used by public activities' })
  @ApiOkResponse({ type: ActivityFilterOptionsResponseDto })
  findFilterOptions(
    @Query() query: ActivityRangeQueryDto,
  ): Promise<ActivityFilterOptionsResponseDto> {
    return this.activitiesService.findPublicFilterOptions(query);
  }

  @Get()
  @ApiOperation({
    summary: 'List published activities or the separate cancelled view',
  })
  @ApiOkResponse({ type: PaginatedActivitiesResponseDto })
  findAll(
    @Query() query: ActivityPaginationQueryDto,
  ): Promise<PaginatedActivitiesResponseDto> {
    return this.activitiesService.findPublicPage(query);
  }
}
