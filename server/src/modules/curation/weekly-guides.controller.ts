import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PublicCacheInterceptor } from '../public-cache/public-cache.interceptor';
import { WeekStartParamDto } from './dto/week-start-param.dto';
import { WeeklyGuideResponseDto } from './dto/weekly-guide-response.dto';
import { WeeklyGuidesService } from './weekly-guides.service';

@ApiTags('weekly guides')
@Controller('weekly-guides')
@UseInterceptors(PublicCacheInterceptor)
export class WeeklyGuidesController {
  constructor(private readonly weeklyGuidesService: WeeklyGuidesService) {}

  @Get(':weekStart')
  @ApiOperation({ summary: "Get a week's published picks" })
  @ApiOkResponse({ type: WeeklyGuideResponseDto })
  @ApiNotFoundResponse({ description: 'No guide is published for the week' })
  findOne(@Param() params: WeekStartParamDto): Promise<WeeklyGuideResponseDto> {
    return this.weeklyGuidesService.findPublished(params.weekStart);
  }
}
