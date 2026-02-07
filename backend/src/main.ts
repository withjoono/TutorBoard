import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:3005', // 학생 앱
      'http://localhost:3006', // 학부모 앱
      'http://localhost:3007', // 선생님 앱 (예정)
    ],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const PORT = 4005;
  await app.listen(PORT);
  console.log(`🚀 TutorBoard Backend running on http://localhost:${PORT}`);
}
bootstrap();
