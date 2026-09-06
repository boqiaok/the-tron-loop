import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { AdminSessionGuard } from '../auth/admin-session.guard';
import {
  CreateSourceDto,
  ImportRunResponseDto,
  SourceResponseDto,
  UpdateSourceDto,
} from './dto/source.dto';
import { IngestionService } from './ingestion.service';

@ApiTags('admin imports')
@Controller('admin')
@UseGuards(AdminSessionGuard)
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('sources')
  @ApiOperation({ summary: 'Create a JSON activity feed source' })
  @ApiCreatedResponse({ type: SourceResponseDto })
  createSource(@Body() dto: CreateSourceDto): Promise<SourceResponseDto> {
    return this.ingestionService.createSource(dto);
  }

  @Get('sources')
  @ApiOperation({ summary: 'List activity feed sources' })
  @ApiOkResponse({ type: [SourceResponseDto] })
  listSources(): Promise<SourceResponseDto[]> {
    return this.ingestionService.listSources();
  }

  @Patch('sources/:id')
  @ApiOperation({ summary: 'Update an activity feed source' })
  @ApiOkResponse({ type: SourceResponseDto })
  updateSource(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSourceDto,
  ): Promise<SourceResponseDto> {
    return this.ingestionService.updateSource(id, dto);
  }

  @Post('sources/:id/import')
  @ApiOperation({ summary: 'Run a source import now' })
  @ApiCreatedResponse({ type: ImportRunResponseDto })
  runImport(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ImportRunResponseDto> {
    return this.ingestionService.importSource(id);
  }

  @Get('imports')
  @ApiOperation({ summary: 'List recent import runs' })
  @ApiOkResponse({ type: [ImportRunResponseDto] })
  listRuns(): Promise<ImportRunResponseDto[]> {
    return this.ingestionService.listRuns();
  }
}
