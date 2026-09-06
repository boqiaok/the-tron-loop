import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminSessionGuard } from '../auth/admin-session.guard';
import { MediaService, type UploadedImage } from './media.service';

@ApiTags('admin media')
@Controller('admin/media/images')
@UseGuards(AdminSessionGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5_000_000, files: 1 } }),
  )
  @ApiOperation({ summary: 'Upload an activity image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({
    schema: {
      properties: {
        filename: { type: 'string' },
        url: { type: 'string', format: 'uri' },
      },
    },
  })
  upload(@UploadedFile() file: UploadedImage | undefined) {
    return this.mediaService.saveImage(file);
  }

  @Delete(':filename')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an uploaded activity image' })
  @ApiNoContentResponse()
  async remove(@Param('filename') filename: string): Promise<void> {
    await this.mediaService.removeImage(filename);
  }
}
