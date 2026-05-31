import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  await app.listen(process.env.GATEWAY_PORT ?? 3000);
  console.log(`Gateway running on port ${process.env.GATEWAY_PORT ?? 3000}`);
}

bootstrap();
