// R2 is replaced by InMemoryS3Client in e2e tests; these values only satisfy
// configuration validation, which runs when AppModule is imported.
process.env.R2_ACCOUNT_ID ??= 'e2e';
process.env.R2_ACCESS_KEY_ID ??= 'e2e';
process.env.R2_SECRET_ACCESS_KEY ??= 'e2e';
process.env.R2_BUCKET ??= 'e2e-media';
process.env.MEDIA_PUBLIC_URL ??= 'https://media.example.test';
