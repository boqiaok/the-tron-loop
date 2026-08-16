import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { PaginatedActivitiesResponseDto } from './dto/activity-response.dto';
import { ActivityPaginationQueryDto } from './dto/activity-query.dto';

@ApiTags('activities')
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List published and cancelled activities' })
  @ApiOkResponse({ type: PaginatedActivitiesResponseDto })
  findAll(
    @Query() query: ActivityPaginationQueryDto,
  ): Promise<PaginatedActivitiesResponseDto> {
    return this.activitiesService.findPublicPage(query);
  }
}
