import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StudentService } from './student.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('student')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class StudentController {
    constructor(private readonly studentService: StudentService) { }

    // ===== 수업 기록 테이블 (공유 테이블) =====
    @Get('classes/:classId/records')
    @Roles('student', 'parent', 'teacher')
    getClassRecords(
        @Param('classId') classId: string,
        @Req() req: any,
    ) {
        return this.studentService.getClassRecords(classId, req.user.id);
    }

    // ===== 수업별 코멘트 =====
    @Get('classes/:classId/comments')
    @Roles('student', 'parent', 'teacher')
    getClassComments(
        @Param('classId') classId: string,
        @Req() req: any,
    ) {
        return this.studentService.getClassComments(classId, req.user.id);
    }

    @Post('classes/:classId/comments')
    @Roles('student', 'parent', 'teacher')
    addClassComment(
        @Param('classId') classId: string,
        @Req() req: any,
        @Body() body: { content: string; targetId?: string },
    ) {
        return this.studentService.addClassComment(classId, req.user.id, body);
    }

    // ===== 통합 스케줄 (StudyPlanner + TutorBoard) =====
    @Get('schedule/integrated')
    getIntegratedSchedule(@Req() req: any) {
        return this.studentService.getIntegratedSchedule(req.user.id);
    }
}
