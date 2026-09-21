import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { DiscoveryService } from './discovery.service';
import {
  ItineraryRequestDto,
  ParseDiscoveryDto,
  RecommendationRequestDto,
} from './dto/discovery.dto';

@ApiTags('discovery')
@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Post('parse')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Parse a natural-language activity request' })
  @ApiOkResponse({ description: 'Parsed intent or a manual-entry fallback' })
  parse(@Body() dto: ParseDiscoveryDto) {
    return this.discovery.parse(dto);
  }

  @Post('recommendations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rank activity sessions for a confirmed intent' })
  @ApiOkResponse({ description: 'Ranked sessions and verified relaxations' })
  recommendations(@Body() dto: RecommendationRequestDto) {
    return this.discovery.recommendations(dto.intent, dto.scope);
  }

  @Post('itineraries')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Build a compatible two- or three-activity plan' })
  @ApiOkResponse({ description: 'Complete, partial, or conflicting plan' })
  itinerary(@Body() dto: ItineraryRequestDto) {
    return this.discovery.itinerary(dto);
  }

  @Post('itineraries/calendar')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="tron-loop-plan.ics"')
  @ApiOperation({ summary: 'Export a compatible plan as an iCalendar file' })
  calendar(@Body() dto: ItineraryRequestDto) {
    return this.discovery.calendar(dto);
  }
}
