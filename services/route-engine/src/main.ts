import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  await app.listen(process.env.ROUTE_ENGINE_PORT ?? 3002);
  console.log(`Route Engine running on port ${process.env.ROUTE_ENGINE_PORT ?? 3002}`);
}

bootstrap();
