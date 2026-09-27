import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminSessionGuard } from '../auth/admin-session.guard';
import { ActivityReviewService } from './activity-review.service';
import { ActivityReviewResponseDto } from './dto/activity-review-response.dto';

@ApiTags('admin activity review')
@Controller('admin/activity-review')
@UseGuards(AdminSessionGuard)
export class AdminActivityReviewController {
  constructor(private readonly activityReviewService: ActivityReviewService) {}

  @Get()
  @ApiOperation({
    summary: 'Sort draft activities into recommended, review and skip groups',
    description:
      'Publish drafts through POST /admin/activities/publish. Each item explains its group.',
  })
  @ApiOkResponse({ type: ActivityReviewResponseDto })
  findAll(): Promise<ActivityReviewResponseDto> {
    return this.activityReviewService.findDrafts();
  }
}
