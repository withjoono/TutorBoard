import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      // 로컬 개발 환경
      'http://localhost:3005', // 학생 앱 (TutorBoard frontend)
      'http://localhost:3006', // 학부모 앱 (예정)
      'http://localhost:3007', // 선생님 앱 (예정)
      'http://localhost:3004', // StudyPlanner Frontend
      'http://localhost:3019', // ParentAdmin (학부모 독립앱)
      'http://localhost:3020', // teacher_Admin (선생님 독립앱)
      // 프로덕션 도메인
      'https://tutorboard-front.web.app', // TutorBoard
      'https://tutorboard-front.firebaseapp.com',
      'https://parent-admin-479305.web.app', // ParentAdmin
      'https://teacher-front.web.app', // TeacherAdmin
      'https://ts-front-479305.web.app', // Hub
      'https://www.geobukschool.kr',
      'https://geobukschool.kr',
    ],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const PORT = process.env.PORT || 4005;
  await app.listen(PORT);
  console.log(`🚀 TutorBoard Backend running on http://localhost:${PORT}`);
}
bootstrap();
