import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClassesModule } from './classes/classes.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { TestsModule } from './tests/tests.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TeacherModule } from './teacher/teacher.module';
import { ParentModule } from './parent/parent.module';
import { IntegrationModule } from './integration/integration.module';
import { SharedScheduleModule } from './shared-schedule/shared-schedule.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ClassesModule,
    AssignmentsModule,
    TestsModule,
    DashboardModule,
    NotificationsModule,
    TeacherModule,
    ParentModule,
    IntegrationModule,
    SharedScheduleModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }


