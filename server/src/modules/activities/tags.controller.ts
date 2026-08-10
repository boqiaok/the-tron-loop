import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { toTagResponse } from './activity.mapper';
import { TagResponseDto } from './dto/activity-response.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { TagsService } from './tags.service';

@ApiTags('tags')
@Controller('admin/tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a tag' })
  @ApiCreatedResponse({ type: TagResponseDto })
  @ApiConflictResponse({ description: 'The tag slug already exists' })
  async create(@Body() dto: CreateTagDto): Promise<TagResponseDto> {
    return toTagResponse(await this.tagsService.create(dto));
  }

  @Get()
  @ApiOperation({ summary: 'List tags' })
  @ApiOkResponse({ type: [TagResponseDto] })
  async findAll(): Promise<TagResponseDto[]> {
    return (await this.tagsService.findAll()).map(toTagResponse);
  }
}
