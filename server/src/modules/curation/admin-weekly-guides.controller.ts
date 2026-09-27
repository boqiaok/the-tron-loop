import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminSessionGuard } from '../auth/admin-session.guard';
import { SaveWeeklyGuideDto } from './dto/save-weekly-guide.dto';
import { WeekStartParamDto } from './dto/week-start-param.dto';
import {
  AdminWeeklyGuideResponseDto,
  WeeklyGuideResponseDto,
} from './dto/weekly-guide-response.dto';
import { WeeklyGuidesService } from './weekly-guides.service';

@ApiTags('admin weekly guides')
@Controller('admin/weekly-guides')
@UseGuards(AdminSessionGuard)
export class AdminWeeklyGuidesController {
  constructor(private readonly weeklyGuidesService: WeeklyGuidesService) {}

  @Get(':weekStart')
  @ApiOperation({
    summary: "Get a week's guide with scored candidate activities",
  })
  @ApiOkResponse({ type: AdminWeeklyGuideResponseDto })
  findOne(
    @Param() params: WeekStartParamDto,
  ): Promise<AdminWeeklyGuideResponseDto> {
    return this.weeklyGuidesService.findForEditing(params.weekStart);
  }

  @Put(':weekStart')
  @ApiOperation({
    summary: "Save a week's intro and picks",
    description:
      'Creates the guide as a draft when it does not exist. Picks replace the existing list in the given order.',
  })
  @ApiOkResponse({ type: WeeklyGuideResponseDto })
  @ApiConflictResponse({
    description: 'A published guide can only contain published activities',
  })
  save(
    @Param() params: WeekStartParamDto,
    @Body() dto: SaveWeeklyGuideDto,
  ): Promise<WeeklyGuideResponseDto> {
    return this.weeklyGuidesService.save(params.weekStart, dto);
  }

  @Post(':weekStart/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Publish a week's guide" })
  @ApiOkResponse({ type: WeeklyGuideResponseDto })
  @ApiConflictResponse({ description: 'The guide cannot be published' })
  @ApiNotFoundResponse({ description: 'The guide does not exist' })
  publish(@Param() params: WeekStartParamDto): Promise<WeeklyGuideResponseDto> {
    return this.weeklyGuidesService.publish(params.weekStart);
  }
}
