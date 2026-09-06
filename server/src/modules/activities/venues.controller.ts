import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { toVenueResponse } from './activity.mapper';
import { VenueResponseDto } from './dto/activity-response.dto';
import { CreateVenueDto } from './dto/create-venue.dto';
import { VenuesService } from './venues.service';
import { AdminSessionGuard } from '../auth/admin-session.guard';

@ApiTags('venues')
@Controller('admin/venues')
@UseGuards(AdminSessionGuard)
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a venue' })
  @ApiCreatedResponse({ type: VenueResponseDto })
  async create(@Body() dto: CreateVenueDto): Promise<VenueResponseDto> {
    return toVenueResponse(await this.venuesService.create(dto));
  }

  @Get()
  @ApiOperation({ summary: 'List venues' })
  @ApiOkResponse({ type: [VenueResponseDto] })
  async findAll(): Promise<VenueResponseDto[]> {
    return (await this.venuesService.findAll()).map(toVenueResponse);
  }
}
