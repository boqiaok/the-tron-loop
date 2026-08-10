import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import {
  ActivityResponseDto,
  PaginatedActivitiesResponseDto,
} from './dto/activity-response.dto';
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

  @Get(':slug')
  @ApiOperation({ summary: 'Get a published or cancelled activity by slug' })
  @ApiOkResponse({ type: ActivityResponseDto })
  @ApiNotFoundResponse({ description: 'Activity not found' })
  findOne(@Param('slug') slug: string): Promise<ActivityResponseDto> {
    return this.activitiesService.findPublicBySlug(slug);
  }
}
