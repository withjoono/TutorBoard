import { Module } from '@nestjs/common';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';
import { SharedScheduleModule } from '../shared-schedule/shared-schedule.module';

@Module({
    imports: [SharedScheduleModule],
    controllers: [TeacherController],
    providers: [TeacherService],
    exports: [TeacherService],
})
export class TeacherModule { }

