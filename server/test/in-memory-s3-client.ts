import {
  DeleteObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  type PutObjectCommandInput,
  type S3Client,
} from '@aws-sdk/client-s3';

/** Stands in for Cloudflare R2 so tests never reach the network. */
export class InMemoryS3Client {
  readonly objects = new Map<string, PutObjectCommandInput>();

  send(command: unknown): Promise<object> {
    if (command instanceof PutObjectCommand) {
      const input = command.input;
      this.objects.set(`${input.Bucket}/${input.Key}`, input);
      return Promise.resolve({});
    }
    if (command instanceof HeadObjectCommand) {
      const { Bucket, Key } = command.input;
      if (!this.objects.has(`${Bucket}/${Key}`)) {
        return Promise.reject(
          new NotFound({ message: 'Not Found', $metadata: {} }),
        );
      }
      return Promise.resolve({});
    }
    if (command instanceof DeleteObjectCommand) {
      const { Bucket, Key } = command.input;
      this.objects.delete(`${Bucket}/${Key}`);
      return Promise.resolve({});
    }
    return Promise.reject(new Error('Unsupported S3 command in tests'));
  }

  asS3Client(): S3Client {
    return this as unknown as S3Client;
  }
}
