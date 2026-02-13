import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:3005', // 학생 앱 (TutorBoard frontend)
      'http://localhost:3006', // 학부모 앱 (예정)
      'http://localhost:3007', // 선생님 앱 (예정)
      'http://localhost:3019', // ParentAdmin (학부모 독립앱)
      'http://localhost:3020', // teacher_Admin (선생님 독립앱)
      'https://tutorboard-front.web.app', // 프로덕션
      'https://tutorboard-front.firebaseapp.com', // 프로덕션 (대체)
    ],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const PORT = process.env.PORT || 4005;
  await app.listen(PORT);
  console.log(`🚀 TutorBoard Backend running on http://localhost:${PORT}`);
}
bootstrap();
