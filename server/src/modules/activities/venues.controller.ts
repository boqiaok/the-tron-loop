import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { toVenueResponse } from './activity.mapper';
import { VenueResponseDto } from './dto/activity-response.dto';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
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

  @Patch(':id')
  @ApiOperation({ summary: 'Update a venue' })
  @ApiOkResponse({ type: VenueResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVenueDto,
  ): Promise<VenueResponseDto> {
    return toVenueResponse(await this.venuesService.update(id, dto));
  }
}
