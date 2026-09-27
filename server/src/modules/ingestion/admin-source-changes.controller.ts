import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminSessionGuard } from '../auth/admin-session.guard';
import { ChangedActivityResponseDto } from './dto/source-change.dto';
import { SourceChangesService } from './source-changes.service';

@ApiTags('admin source changes')
@Controller('admin/source-changes')
@UseGuards(AdminSessionGuard)
export class AdminSourceChangesController {
  constructor(private readonly sourceChangesService: SourceChangesService) {}

  @Get()
  @ApiOperation({
    summary: 'List published activities whose source has changed',
    description:
      'Covers cancellation, removed upcoming dates, venue, title and cost. New dates are added automatically.',
  })
  @ApiOkResponse({ type: [ChangedActivityResponseDto] })
  findAll(): Promise<ChangedActivityResponseDto[]> {
    return this.sourceChangesService.findPending();
  }

  @Post(':activityId/accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Mark an activity's source changes as checked",
    description:
      'Later imports compare the source with this listing, so the same changes are not reported again.',
  })
  @ApiNoContentResponse()
  @ApiConflictResponse({ description: 'The activity has no source changes' })
  @ApiNotFoundResponse({ description: 'Activity not found' })
  async accept(
    @Param('activityId', ParseUUIDPipe) activityId: string,
  ): Promise<void> {
    await this.sourceChangesService.accept(activityId);
  }
}
