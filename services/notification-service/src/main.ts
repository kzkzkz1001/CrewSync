import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  await app.listen(process.env.NOTIFICATION_SERVICE_PORT ?? 3003);
  console.log(`Notification Service running on port ${process.env.NOTIFICATION_SERVICE_PORT ?? 3003}`);
}

bootstrap();
