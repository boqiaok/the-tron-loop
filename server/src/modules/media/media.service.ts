import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

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
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(
    private readonly s3: S3Client,
    configService: ConfigService,
  ) {
    this.bucket = configService.getOrThrow<string>('R2_BUCKET');
    this.publicUrl = configService
      .getOrThrow<string>('MEDIA_PUBLIC_URL')
      .replace(/\/$/, '');
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

    const filename = `${randomUUID()}${extension}`;
    const key = imageKey(filename);
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        // Filenames are random UUIDs, so an object's content never changes.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return { filename, url: `${this.publicUrl}/${key}` };
  }

  async removeImage(filename: string): Promise<void> {
    if (!/^[0-9a-f-]{36}\.(?:jpg|png|webp|avif)$/.test(filename)) {
      throw new NotFoundException('Image not found');
    }
    const key = imageKey(filename);
    try {
      await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (error) {
      if (error instanceof NotFound) {
        throw new NotFoundException('Image not found');
      }
      throw error;
    }
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}

function imageKey(filename: string): string {
  return `images/${filename}`;
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
