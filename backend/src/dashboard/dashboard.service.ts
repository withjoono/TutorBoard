import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) { }

    // 학생 대시보드: 개인 요약 데이터
    async getStudentDashboard(studentId: string) {
        const enrollments = await this.prisma.tbClassEnrollment.findMany({
            where: { studentId },
            select: { classId: true },
        });
        const classIds = enrollments.map((e) => e.classId);

        // 진도 평균
        const lessonPlans = await this.prisma.tbLessonPlan.findMany({
            where: { classId: { in: classIds } },
            select: { progress: true },
        });
        const avgProgress = lessonPlans.length > 0
            ? Math.round(lessonPlans.reduce((s, l) => s + l.progress, 0) / lessonPlans.length)
            : 0;

        // 미제출 과제 수
        const allAssignments = await this.prisma.tbAssignment.findMany({
            where: { lesson: { classId: { in: classIds } } },
            select: { id: true },
        });
        const submittedIds = await this.prisma.tbAssignmentSubmission.findMany({
            where: { studentId, status: { not: 'pending' } },
            select: { assignmentId: true },
        });
        const submittedSet = new Set(submittedIds.map((s) => s.assignmentId));
        const pendingCount = allAssignments.filter((a) => !submittedSet.has(a.id)).length;

        // 최근 테스트 점수
        const recentTests = await this.prisma.tbTestResult.findMany({
            where: { studentId },
            include: { test: { select: { title: true, maxScore: true } } },
            orderBy: { takenAt: 'desc' },
            take: 5,
        });

        const avgScore = recentTests.length > 0
            ? Math.round(recentTests.reduce((s, r) => s + (r.score / r.test.maxScore) * 100, 0) / recentTests.length)
            : 0;


        // 다가오는 수업 (14일 이내)
        const upcomingLessons = await this.prisma.tbLessonPlan.findMany({
            where: {
                classId: { in: classIds },
                scheduledDate: {
                    gte: new Date(),
                    lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
                },
            },
            include: {
                class: { select: { name: true, subject: true, teacher: { select: { username: true } } } },
            },
            orderBy: { scheduledDate: 'asc' },
        });

        // 다가오는 마감 (과제)
        const upcomingDeadlines = await this.prisma.tbAssignment.findMany({
            where: {
                lesson: { classId: { in: classIds } },
                dueDate: { gte: new Date() },
            },
            include: {
                lesson: { select: { title: true, class: { select: { name: true, subject: true } } } },
                submissions: { where: { studentId }, select: { status: true } },
            },
            orderBy: { dueDate: 'asc' },
            take: 5,
        });

        // 배지
        const badges = await this.prisma.tbStudentBadge.findMany({
            where: { studentId },
            orderBy: { earnedAt: 'desc' },
            take: 3,
        });

        // 알림 미읽기
        const unreadNotifications = await this.prisma.tbNotification.count({
            where: { userId: studentId, read: false },
        });

        return {
            summary: {
                totalClasses: classIds.length,
                avgProgress,
                pendingAssignments: pendingCount,
                avgScore,
                unreadNotifications,
            },
            recentTests: recentTests.map((r) => ({
                testTitle: r.test.title,
                score: r.score,
                maxScore: r.test.maxScore,
                percentage: Math.round((r.score / r.test.maxScore) * 100),
                takenAt: r.takenAt,
            })),
            upcomingLessons: upcomingLessons.map((l) => ({
                id: l.id,
                title: l.title,
                subject: l.class.subject,
                date: l.scheduledDate,
                startTime: '14:00', // TODO: Add time field to LessonPlan or Schedule
                endTime: '15:30',
                color: '#6366f1', // TODO: Map subject to color in frontend or backend
                teacher: l.class.teacher.username,
                classId: l.classId,
            })),
            upcomingDeadlines: upcomingDeadlines.map((a) => ({
                id: a.id,
                title: a.title,
                dueDate: a.dueDate,
                className: a.lesson.class.name,
                lessonTitle: a.lesson.title,
                subject: a.lesson.class.subject,
                submissionStatus: a.submissions[0]?.status || 'pending',
                daysLeft: a.dueDate ? Math.ceil((new Date(a.dueDate).getTime() - Date.now()) / 86400000) : null,
            })),
            recentBadges: badges,
        };
    }
}
