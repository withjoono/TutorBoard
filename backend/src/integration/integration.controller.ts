
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('integration')
export class IntegrationController {
    constructor(private prisma: PrismaService) { }

    @UseGuards(JwtAuthGuard)
    @Get('calendar-events')
    async getCalendarEvents(@Request() req) {
        const userId = req.user.hubUserId; // Hub SSO ID 사용
        // 학생이 속한 클래스 찾기
        const enrollments = await this.prisma.tbClassEnrollment.findMany({
            where: { studentId: userId },
            select: { classId: true },
        });
        const classIds = enrollments.map((e) => e.classId);

        // 1. 과제 (Assignments)
        const assignments = await this.prisma.tbAssignment.findMany({
            where: {
                lesson: { classId: { in: classIds } },
                dueDate: { not: null },
            },
            select: {
                id: true,
                title: true,
                dueDate: true,
                lesson: {
                    select: {
                        title: true,
                        class: { select: { name: true } },
                    },
                },
            },
        });

        // 2. 시험 (Tests)
        const tests = await this.prisma.tbTest.findMany({
            where: {
                lesson: { classId: { in: classIds } },
                testDate: { not: null },
            },
            select: {
                id: true,
                title: true,
                testDate: true,
                lesson: {
                    select: {
                        title: true,
                        class: { select: { name: true } },
                    },
                },
            },
        });

        return {
            assignments: assignments.map(a => ({
                id: a.id,
                type: 'assignment',
                title: a.title,
                date: a.dueDate,
                className: a.lesson.class.name,
                lessonTitle: a.lesson.title,
            })),
            tests: tests.map(t => ({
                id: t.id,
                type: 'test',
                title: t.title,
                date: t.testDate,
                className: t.lesson.class.name,
                lessonTitle: t.lesson.title,
            })),
        };
    }
}
