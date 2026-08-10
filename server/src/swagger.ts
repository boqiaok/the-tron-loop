import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('The Tron Loop API')
    .setDescription('API for the Hamilton weekly activity guide')
    .setVersion('1.0')
    .addTag('health')
    .addTag('activities')
    .addTag('admin activities')
    .addTag('venues')
    .addTag('tags')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, documentFactory);
}
