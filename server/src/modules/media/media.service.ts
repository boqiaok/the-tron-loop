import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const IMAGE_TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/avif', '.avif'],
]);

export interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@Injectable()
export class MediaService {
  private readonly storagePath: string;

  constructor(private readonly configService: ConfigService) {
    this.storagePath = resolve(
      configService.get<string>('MEDIA_STORAGE_PATH') ?? './media',
      'images',
    );
  }

  async saveImage(file: UploadedImage | undefined): Promise<{
    filename: string;
    url: string;
  }> {
    if (!file) throw new BadRequestException('Choose an image to upload');
    const extension = IMAGE_TYPES.get(file.mimetype);
    if (!extension || !hasValidSignature(file.buffer, file.mimetype)) {
      throw new BadRequestException(
        'Upload a valid JPEG, PNG, WebP or AVIF image',
      );
    }

    await mkdir(this.storagePath, { recursive: true });
    const filename = `${randomUUID()}${extension}`;
    await writeFile(resolve(this.storagePath, filename), file.buffer, {
      flag: 'wx',
    });

    const publicApiUrl = (
      this.configService.get<string>('PUBLIC_API_URL') ??
      `http://localhost:${this.configService.getOrThrow<number>('PORT')}`
    ).replace(/\/$/, '');
    return { filename, url: `${publicApiUrl}/media/images/${filename}` };
  }

  async removeImage(filename: string): Promise<void> {
    if (!/^[0-9a-f-]{36}\.(?:jpg|png|webp|avif)$/.test(filename)) {
      throw new NotFoundException('Image not found');
    }
    try {
      await unlink(resolve(this.storagePath, filename));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NotFoundException('Image not found');
      }
      throw error;
    }
  }
}

function hasValidSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') {
    return (
      buffer.length >= 3 &&
      buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    );
  }
  if (mimeType === 'image/png') {
    return (
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }
  if (mimeType === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    );
  }
  if (mimeType === 'image/avif') {
    return (
      buffer.length >= 12 &&
      buffer.toString('ascii', 4, 8) === 'ftyp' &&
      buffer.toString('ascii', 8, 12).startsWith('avi')
    );
  }
  return false;
}
