import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InMemoryS3Client } from '../../../test/in-memory-s3-client';
import { MediaService } from './media.service';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

describe('MediaService', () => {
  let s3: InMemoryS3Client;
  let service: MediaService;

  beforeEach(() => {
    s3 = new InMemoryS3Client();
    service = new MediaService(
      s3.asS3Client(),
      new ConfigService({
        R2_BUCKET: 'whson-media',
        MEDIA_PUBLIC_URL: 'https://media.whson.com/',
      }),
    );
  });

  it('stores an image in the bucket and returns its public URL', async () => {
    const result = await service.saveImage({
      buffer: PNG,
      mimetype: 'image/png',
      originalname: 'activity.png',
      size: PNG.length,
    });

    expect(result.filename).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(result.url).toBe(
      `https://media.whson.com/images/${result.filename}`,
    );
    const stored = s3.objects.get(`whson-media/images/${result.filename}`);
    expect(stored).toMatchObject({
      Body: PNG,
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
    });
  });

  it('rejects a file whose content does not match its image type', async () => {
    await expect(
      service.saveImage({
        buffer: Buffer.from('not an image'),
        mimetype: 'image/png',
        originalname: 'fake.png',
        size: 12,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(s3.objects.size).toBe(0);
  });

  it('removes a stored image', async () => {
    const { filename } = await service.saveImage({
      buffer: PNG,
      mimetype: 'image/png',
      originalname: 'activity.png',
      size: PNG.length,
    });

    await service.removeImage(filename);

    expect(s3.objects.size).toBe(0);
  });

  it('reports a missing image as not found', async () => {
    await expect(
      service.removeImage('00000000-0000-0000-0000-000000000000.png'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses filenames that are not generated image names', async () => {
    await expect(
      service.removeImage('../database.dump'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
