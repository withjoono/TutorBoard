import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ParentService {
    constructor(private prisma: PrismaService) { }

    // ===== DASHBOARD =====

    async getParentDashboard(parentId: string) {
        const enrollments = await this.prisma.tbClassEnrollment.findMany({
            where: { parentId },
            include: {
                student: { select: { id: true, username: true, avatarUrl: true } },
                class: {
                    select: { id: true, name: true, teacher: { select: { username: true } } },
                },
            },
        });

        if (enrollments.length === 0) return { children: [], recentNotifications: [] };

        const studentIds = [...new Set(enrollments.map((e) => e.studentId))];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [todayAttendance, recentNotifications, pendingAssignments] = await Promise.all([
            this.prisma.tbAttendance.findMany({
                where: { studentId: { in: studentIds }, date: { gte: today, lt: tomorrow } },
                include: {
                    class: { select: { name: true } },
                    student: { select: { id: true, username: true } },
                },
            }),
            this.prisma.tbNotification.findMany({
                where: { userId: parentId },
                orderBy: { sentAt: 'desc' },
                take: 10,
            }),
            this.prisma.tbAssignmentSubmission.findMany({
                where: { studentId: { in: studentIds }, status: 'pending' },
                include: {
                    assignment: { select: { title: true, dueDate: true } },
                    student: { select: { id: true, username: true } },
                },
            }),
        ]);

        const children = studentIds.map((sid) => {
            const student = enrollments.find((e) => e.studentId === sid)!.student;
            const classes = enrollments
                .filter((e) => e.studentId === sid)
                .map((e) => e.class);
            const attendance = todayAttendance.filter((a) => a.studentId === sid);
            const pending = pendingAssignments.filter((p) => p.studentId === sid);

            return {
                student,
                classes,
                todayAttendance: attendance,
                pendingAssignments: pending.length,
            };
        });

        return { children, recentNotifications };
    }

    // ===== CHILD ATTENDANCE =====

    async getChildAttendance(parentId: string, childId: string, month?: string) {
        await this.ensureParentOfChild(parentId, childId);

        const where: any = { studentId: childId };
        if (month) {
            const start = new Date(`${month}-01`);
            const end = new Date(start);
            end.setMonth(end.getMonth() + 1);
            where.date = { gte: start, lt: end };
        }

        return this.prisma.tbAttendance.findMany({
            where,
            include: { class: { select: { name: true } } },
            orderBy: { date: 'desc' },
        });
    }

    // ===== CHILD TIMELINE =====

    async getChildTimeline(parentId: string, childId: string, classId?: string) {
        await this.ensureParentOfChild(parentId, childId);

        const classFilter = classId ? { classId } : {};

        const [lessonRecords, testResults, submissions] = await Promise.all([
            this.prisma.tbLessonRecord.findMany({
                where: { lessonPlan: { ...classFilter } },
                include: {
                    lessonPlan: {
                        select: { title: true, class: { select: { name: true } } },
                    },
                },
                orderBy: { recordDate: 'desc' },
                take: 50,
            }),
            this.prisma.tbTestResult.findMany({
                where: { studentId: childId, test: { lesson: { ...classFilter } } },
                include: {
                    test: {
                        select: { title: true, maxScore: true, testDate: true, lesson: { select: { class: { select: { name: true } } } } },
                    },
                },
                orderBy: { takenAt: 'desc' },
                take: 20,
            }),
            this.prisma.tbAssignmentSubmission.findMany({
                where: { studentId: childId, assignment: { lesson: { ...classFilter } } },
                include: {
                    assignment: {
                        select: { title: true, dueDate: true, lesson: { select: { class: { select: { name: true } } } } },
                    },
                },
                orderBy: { submittedAt: 'desc' },
                take: 20,
            }),
        ]);

        // Merge into a unified timeline sorted by date
        const timeline = [
            ...lessonRecords.map((r) => ({
                type: 'lesson' as const,
                date: r.recordDate,
                title: r.lessonPlan.title,
                className: r.lessonPlan.class.name,
                summary: r.summary,
                pagesFrom: r.pagesFrom,
                pagesTo: r.pagesTo,
            })),
            ...testResults.map((r) => ({
                type: 'test' as const,
                date: r.takenAt,
                title: r.test.title,
                className: r.test.lesson.class.name,
                score: r.score,
                maxScore: r.test.maxScore,
            })),
            ...submissions.map((s) => ({
                type: 'assignment' as const,
                date: s.submittedAt,
                title: s.assignment.title,
                className: s.assignment.lesson.class.name,
                status: s.status,
                grade: s.grade,
                dueDate: s.assignment.dueDate,
            })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return timeline;
    }

    // ===== CHILD TEST TREND =====

    async getChildTestTrend(parentId: string, childId: string, classId?: string) {
        await this.ensureParentOfChild(parentId, childId);

        const where: any = { studentId: childId };
        if (classId) where.test = { lesson: { classId } };

        const results = await this.prisma.tbTestResult.findMany({
            where,
            include: {
                test: { select: { title: true, maxScore: true, testDate: true } },
            },
            orderBy: { takenAt: 'asc' },
        });

        return results.map((r) => ({
            testTitle: r.test.title,
            date: r.test.testDate || r.takenAt,
            score: r.score,
            maxScore: r.test.maxScore,
            percentage: Math.round((r.score / r.test.maxScore) * 100),
        }));
    }

    // ===== PRIVATE COMMENTS =====

    async getPrivateComments(parentId: string, childId: string) {
        await this.ensureParentOfChild(parentId, childId);

        return this.prisma.tbPrivateComment.findMany({
            where: {
                OR: [
                    { targetId: parentId, studentId: childId },
                    { authorId: parentId, studentId: childId },
                ],
            },
            include: {
                author: { select: { id: true, username: true, role: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async replyToComment(parentId: string, data: {
        targetId: string; studentId: string; contextType?: string; contextId?: string; content: string;
    }) {
        const comment = await this.prisma.tbPrivateComment.create({
            data: {
                authorId: parentId,
                targetId: data.targetId,
                studentId: data.studentId,
                contextType: data.contextType,
                contextId: data.contextId,
                content: data.content,
            },
        });

        await this.prisma.tbNotification.create({
            data: {
                userId: data.targetId,
                message: '학부모님이 코멘트에 답변하셨습니다.',
                type: 'comment',
                referenceId: comment.id,
                referenceType: 'comment',
            },
        });

        return comment;
    }

    // ===== HELPERS =====

    private async ensureParentOfChild(parentId: string, childId: string) {
        const enrollment = await this.prisma.tbClassEnrollment.findFirst({
            where: { parentId, studentId: childId },
        });
        if (!enrollment) throw new ForbiddenException('Access denied: not your child');
        return enrollment;
    }
}
