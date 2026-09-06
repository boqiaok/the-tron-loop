import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { AuthService } from '../../modules/auth/auth.service';

async function createAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'Set ADMIN_EMAIL and ADMIN_PASSWORD before running admin:create',
    );
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const user = await app.get(AuthService).createAdmin(email, password);
    console.log(`Administrator created: ${user.email}`);
  } finally {
    await app.close();
  }
}

void createAdmin();
