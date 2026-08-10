import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
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
import { AdminActivityQueryDto } from './dto/activity-query.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@ApiTags('admin activities')
@Controller('admin/activities')
export class AdminActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @ApiOperation({ summary: 'Create an activity draft' })
  @ApiCreatedResponse({ type: ActivityResponseDto })
  @ApiConflictResponse({ description: 'The activity slug already exists' })
  create(@Body() dto: CreateActivityDto): Promise<ActivityResponseDto> {
    return this.activitiesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List activities for administration' })
  @ApiOkResponse({ type: PaginatedActivitiesResponseDto })
  findAll(
    @Query() query: AdminActivityQueryDto,
  ): Promise<PaginatedActivitiesResponseDto> {
    return this.activitiesService.findAdminPage(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an activity by ID for administration' })
  @ApiOkResponse({ type: ActivityResponseDto })
  @ApiNotFoundResponse({ description: 'Activity not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ActivityResponseDto> {
    return this.activitiesService.findAdminById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an activity' })
  @ApiOkResponse({ type: ActivityResponseDto })
  @ApiConflictResponse({
    description: 'The slug exists or the activity cannot be edited',
  })
  @ApiNotFoundResponse({ description: 'Activity not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActivityDto,
  ): Promise<ActivityResponseDto> {
    return this.activitiesService.update(id, dto);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish an activity draft' })
  @ApiOkResponse({ type: ActivityResponseDto })
  @ApiConflictResponse({ description: 'The activity cannot be published' })
  @ApiNotFoundResponse({ description: 'Activity not found' })
  publish(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ActivityResponseDto> {
    return this.activitiesService.publish(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a published activity' })
  @ApiOkResponse({ type: ActivityResponseDto })
  @ApiConflictResponse({ description: 'The activity cannot be cancelled' })
  @ApiNotFoundResponse({ description: 'Activity not found' })
  cancel(@Param('id', ParseUUIDPipe) id: string): Promise<ActivityResponseDto> {
    return this.activitiesService.cancel(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an activity draft' })
  @ApiNoContentResponse()
  @ApiConflictResponse({ description: 'Only draft activities can be deleted' })
  @ApiNotFoundResponse({ description: 'Activity not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.activitiesService.removeDraft(id);
  }
}
