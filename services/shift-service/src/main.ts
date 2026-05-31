import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  await app.listen(process.env.SHIFT_SERVICE_PORT ?? 3001);
  console.log(`Shift Service running on port ${process.env.SHIFT_SERVICE_PORT ?? 3001}`);
}

bootstrap();
