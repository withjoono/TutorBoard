import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TeacherService } from './teacher.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('teacher')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('teacher')
export class TeacherController {
    constructor(private readonly teacherService: TeacherService) { }

    // ===== DASHBOARD =====
    @Get('dashboard')
    getDashboard(@Req() req: any) {
        return this.teacherService.getTeacherDashboard(req.user.id);
    }

    // ===== CLASS MANAGEMENT =====
    @Get('classes')
    getMyClasses(@Req() req: any) {
        return this.teacherService.getMyClasses(req.user.id);
    }

    @Get('classes/:classId/students')
    getClassStudents(@Req() req: any, @Param('classId') classId: string) {
        return this.teacherService.getClassStudents(req.user.id, classId);
    }

    // ===== LESSON PLANS =====
    @Get('classes/:classId/lesson-plans')
    getLessonPlans(@Req() req: any, @Param('classId') classId: string) {
        return this.teacherService.getLessonPlans(req.user.id, classId);
    }

    @Post('classes/:classId/lesson-plans')
    createLessonPlan(
        @Req() req: any,
        @Param('classId') classId: string,
        @Body() body: { title: string; description?: string; scheduledDate?: string },
    ) {
        return this.teacherService.createLessonPlan(req.user.id, classId, body);
    }

    @Put('classes/:classId/lesson-plans/:planId')
    updateLessonPlan(
        @Req() req: any,
        @Param('classId') classId: string,
        @Param('planId') planId: string,
        @Body() body: { title?: string; description?: string; scheduledDate?: string; progress?: number },
    ) {
        return this.teacherService.updateLessonPlan(req.user.id, classId, planId, body);
    }

    @Delete('classes/:classId/lesson-plans/:planId')
    deleteLessonPlan(
        @Req() req: any,
        @Param('classId') classId: string,
        @Param('planId') planId: string,
    ) {
        return this.teacherService.deleteLessonPlan(req.user.id, classId, planId);
    }

    // ===== LESSON RECORDS (진도 기록) =====
    @Post('classes/:classId/lesson-records')
    createLessonRecord(
        @Req() req: any,
        @Param('classId') classId: string,
        @Body() body: {
            lessonPlanId: string; recordDate: string; summary?: string;
            pagesFrom?: number; pagesTo?: number; conceptNote?: string; fileUrl?: string;
        },
    ) {
        return this.teacherService.createLessonRecord(req.user.id, classId, body);
    }

    // ===== ATTENDANCE (출결) =====
    @Post('classes/:classId/attendance')
    bulkCheckAttendance(
        @Req() req: any,
        @Param('classId') classId: string,
        @Body() body: {
            date: string;
            records: Array<{ studentId: string; status: 'present' | 'late' | 'absent'; note?: string }>;
        },
    ) {
        return this.teacherService.bulkCheckAttendance(req.user.id, classId, body);
    }

    @Get('classes/:classId/attendance')
    getAttendance(
        @Req() req: any,
        @Param('classId') classId: string,
        @Query('date') date?: string,
    ) {
        return this.teacherService.getAttendance(req.user.id, classId, date);
    }

    // ===== TESTS =====
    @Post('classes/:classId/tests')
    createTest(
        @Req() req: any,
        @Param('classId') classId: string,
        @Body() body: {
            lessonId: string; title: string; description?: string; testDate?: string; maxScore: number;
        },
    ) {
        return this.teacherService.createTest(req.user.id, classId, body);
    }

    @Post('tests/:testId/results')
    bulkInputTestResults(
        @Req() req: any,
        @Param('testId') testId: string,
        @Body() body: { results: Array<{ studentId: string; score: number; feedback?: string }> },
    ) {
        return this.teacherService.bulkInputTestResults(req.user.id, testId, body.results);
    }

    @Get('tests/:testId/results')
    getTestResults(@Req() req: any, @Param('testId') testId: string) {
        return this.teacherService.getTestResults(req.user.id, testId);
    }

    // ===== ASSIGNMENTS =====
    @Post('classes/:classId/assignments')
    createAssignment(
        @Req() req: any,
        @Param('classId') classId: string,
        @Body() body: {
            lessonId: string; title: string; description?: string; dueDate?: string; fileUrl?: string;
        },
    ) {
        return this.teacherService.createAssignment(req.user.id, classId, body);
    }

    @Get('assignments/:assignmentId/submissions')
    getAssignmentSubmissions(
        @Req() req: any,
        @Param('assignmentId') assignmentId: string,
    ) {
        return this.teacherService.getAssignmentSubmissions(req.user.id, assignmentId);
    }

    @Patch('submissions/:submissionId/grade')
    gradeSubmission(
        @Req() req: any,
        @Param('submissionId') submissionId: string,
        @Body() body: { grade?: number; feedback?: string },
    ) {
        return this.teacherService.gradeSubmission(req.user.id, submissionId, { ...body, status: 'graded' });
    }

    // ===== PRIVATE COMMENTS =====
    @Post('comments')
    createPrivateComment(
        @Req() req: any,
        @Body() body: {
            targetId: string; studentId?: string; contextType?: string;
            contextId?: string; content: string; imageUrl?: string;
        },
    ) {
        return this.teacherService.createPrivateComment(req.user.id, body);
    }

    @Get('comments/:studentId')
    getPrivateComments(@Req() req: any, @Param('studentId') studentId: string) {
        return this.teacherService.getPrivateComments(req.user.id, studentId);
    }
}
