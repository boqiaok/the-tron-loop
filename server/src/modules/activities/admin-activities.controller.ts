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
  UseGuards,
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
  AdminActivitiesPageResponseDto,
} from './dto/activity-response.dto';
import { AdminActivityQueryDto } from './dto/activity-query.dto';
import {
  BulkActivitiesDto,
  BulkPublishActivitiesResponseDto,
  BulkRejectActivitiesDto,
  BulkRejectActivitiesResponseDto,
} from './dto/bulk-activities.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { AdminSessionGuard } from '../auth/admin-session.guard';

@ApiTags('admin activities')
@Controller('admin/activities')
@UseGuards(AdminSessionGuard)
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
  @ApiOkResponse({ type: AdminActivitiesPageResponseDto })
  findAll(
    @Query() query: AdminActivityQueryDto,
  ): Promise<AdminActivitiesPageResponseDto> {
    return this.activitiesService.findAdminPage(query);
  }

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publish several activity drafts',
    description:
      'Each activity is published independently; activities that cannot be published are reported as skipped.',
  })
  @ApiOkResponse({ type: BulkPublishActivitiesResponseDto })
  publishMany(
    @Body() dto: BulkActivitiesDto,
  ): Promise<BulkPublishActivitiesResponseDto> {
    return this.activitiesService.publishMany(dto.ids);
  }

  @Post('reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject several activity drafts',
    description:
      'Rejected activities stay out of the public site and are left alone by later imports. Activities that cannot be rejected are reported as skipped.',
  })
  @ApiOkResponse({ type: BulkRejectActivitiesResponseDto })
  rejectMany(
    @Body() dto: BulkRejectActivitiesDto,
  ): Promise<BulkRejectActivitiesResponseDto> {
    return this.activitiesService.rejectMany(dto.ids, dto.reason);
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

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Return a rejected activity to the drafts' })
  @ApiOkResponse({ type: ActivityResponseDto })
  @ApiConflictResponse({ description: 'The activity is not rejected' })
  @ApiNotFoundResponse({ description: 'Activity not found' })
  restore(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ActivityResponseDto> {
    return this.activitiesService.restore(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft created by an administrator' })
  @ApiNoContentResponse()
  @ApiConflictResponse({
    description:
      'Only drafts can be deleted, and imported drafts must be rejected instead',
  })
  @ApiNotFoundResponse({ description: 'Activity not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.activitiesService.removeDraft(id);
  }
}
