import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { SharedScheduleService } from '../shared-schedule/shared-schedule.service';

@Injectable()
export class TeacherService {
    private readonly logger = new Logger(TeacherService.name);

    constructor(
        private prisma: PrismaService,
        private sharedSchedule: SharedScheduleService,
    ) { }

    // ===== CLASS MANAGEMENT =====

    async getMyClasses(teacherId: string) {
        return this.prisma.tbClass.findMany({
            where: { teacherId },
            include: {
                enrollments: {
                    include: {
                        student: { select: { id: true, username: true, avatarUrl: true } },
                        parent: { select: { id: true, username: true } },
                    },
                },
                _count: { select: { enrollments: true, lessonPlans: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getClassStudents(teacherId: string, classId: string) {
        await this.ensureTeacherOwnsClass(teacherId, classId);
        return this.prisma.tbClassEnrollment.findMany({
            where: { classId },
            include: {
                student: { select: { id: true, username: true, email: true, phone: true, avatarUrl: true } },
                parent: { select: { id: true, username: true, email: true, phone: true } },
            },
            orderBy: { enrolledAt: 'asc' },
        });
    }

    // ===== LESSON PLANS =====

    async createLessonPlan(teacherId: string, classId: string, data: {
        title: string; description?: string; scheduledDate?: string;
    }) {
        await this.ensureTeacherOwnsClass(teacherId, classId);
        return this.prisma.tbLessonPlan.create({
            data: {
                classId,
                title: data.title,
                description: data.description,
                scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
            },
        });
    }

    async updateLessonPlan(teacherId: string, classId: string, planId: string, data: {
        title?: string; description?: string; scheduledDate?: string; progress?: number;
    }) {
        await this.ensureTeacherOwnsClass(teacherId, classId);
        return this.prisma.tbLessonPlan.update({
            where: { id: planId },
            data: {
                ...(data.title && { title: data.title }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.scheduledDate && { scheduledDate: new Date(data.scheduledDate) }),
                ...(data.progress !== undefined && { progress: data.progress }),
            },
        });
    }

    async deleteLessonPlan(teacherId: string, classId: string, planId: string) {
        await this.ensureTeacherOwnsClass(teacherId, classId);
        return this.prisma.tbLessonPlan.delete({ where: { id: planId } });
    }

    async getLessonPlans(teacherId: string, classId: string) {
        await this.ensureTeacherOwnsClass(teacherId, classId);
        return this.prisma.tbLessonPlan.findMany({
            where: { classId },
            include: {
                assignments: { select: { id: true, title: true, dueDate: true } },
                tests: { select: { id: true, title: true, testDate: true } },
                records: { orderBy: { recordDate: 'desc' } },
            },
            orderBy: { scheduledDate: 'asc' },
        });
    }

    // ===== LESSON RECORDS (진도 기록) =====

    async createLessonRecord(teacherId: string, classId: string, data: {
        lessonPlanId: string; recordDate: string; summary?: string;
        pagesFrom?: number; pagesTo?: number; conceptNote?: string; fileUrl?: string;
    }) {
        await this.ensureTeacherOwnsClass(teacherId, classId);
        return this.prisma.tbLessonRecord.create({
            data: {
                lessonPlanId: data.lessonPlanId,
                recordDate: new Date(data.recordDate),
                summary: data.summary,
                pagesFrom: data.pagesFrom,
                pagesTo: data.pagesTo,
                conceptNote: data.conceptNote,
                fileUrl: data.fileUrl,
            },
        });
    }

    // ===== ATTENDANCE (출결) =====

    async bulkCheckAttendance(teacherId: string, classId: string, data: {
        date: string; records: Array<{ studentId: string; status: 'present' | 'late' | 'absent'; note?: string }>;
    }) {
        await this.ensureTeacherOwnsClass(teacherId, classId);
        const date = new Date(data.date);

        const upserts = data.records.map((r) =>
            this.prisma.tbAttendance.upsert({
                where: {
                    classId_studentId_date: { classId, studentId: r.studentId, date },
                },
                update: { status: r.status, note: r.note },
                create: {
                    classId,
                    studentId: r.studentId,
                    date,
                    status: r.status,
                    note: r.note,
                },
            }),
        );

        const results = await this.prisma.$transaction(upserts);

        // Create notifications for parents on status changes
        const enrollments = await this.prisma.tbClassEnrollment.findMany({
            where: { classId, studentId: { in: data.records.map((r) => r.studentId) } },
            include: { student: { select: { username: true } } },
        });

        const notifications: Prisma.PrismaPromise<any>[] = [];
        for (const record of data.records) {
            const enrollment = enrollments.find((e) => e.studentId === record.studentId);
            if (enrollment?.parentId) {
                const statusKo = record.status === 'present' ? '출석' : record.status === 'late' ? '지각' : '결석';
                notifications.push(
                    this.prisma.tbNotification.create({
                        data: {
                            userId: enrollment.parentId,
                            message: `${enrollment.student.username} 학생이 ${statusKo} 처리되었습니다.`,
                            type: 'attendance',
                            referenceId: classId,
                            referenceType: 'attendance',
                        },
                    }),
                );
            }
        }
        if (notifications.length > 0) {
            await this.prisma.$transaction(notifications);
        }

        return results;
    }

    async getAttendance(teacherId: string, classId: string, date?: string) {
        await this.ensureTeacherOwnsClass(teacherId, classId);
        const where: any = { classId };
        if (date) where.date = new Date(date);

        return this.prisma.tbAttendance.findMany({
            where,
            include: {
                student: { select: { id: true, username: true, avatarUrl: true } },
            },
            orderBy: [{ date: 'desc' }, { student: { username: 'asc' } }],
        });
    }

    // ===== TESTS (테스트 점수 입력) =====

    async createTest(teacherId: string, classId: string, data: {
        lessonId: string; title: string; description?: string; testDate?: string; maxScore: number;
    }) {
        await this.ensureTeacherOwnsClass(teacherId, classId);
        const test = await this.prisma.tbTest.create({
            data: {
                lessonId: data.lessonId,
                title: data.title,
                description: data.description,
                testDate: data.testDate ? new Date(data.testDate) : null,
                maxScore: data.maxScore,
            },
            include: { lesson: { include: { class: { select: { name: true, subject: true } } } } },
        });

        // 공유 스케줄에 동기화 (수강생별)
        this.syncEventForClassStudents(classId, test.id, 'test', test, test.lesson);

        return test;
    }

    async bulkInputTestResults(teacherId: string, testId: string, results: Array<{
        studentId: string; score: number; feedback?: string;
    }>) {
        const test = await this.prisma.tbTest.findUnique({
            where: { id: testId },
            include: { lesson: { select: { classId: true } } },
        });
        if (!test) throw new NotFoundException('Test not found');
        await this.ensureTeacherOwnsClass(teacherId, test.lesson.classId);

        const upserts = results.map((r) =>
            this.prisma.tbTestResult.upsert({
                where: { testId_studentId: { testId, studentId: r.studentId } },
                update: { score: r.score, feedback: r.feedback },
                create: {
                    testId,
                    studentId: r.studentId,
                    score: r.score,
                    feedback: r.feedback,
                },
            }),
        );

        const saved = await this.prisma.$transaction(upserts);

        // Notify students & parents
        const enrollments = await this.prisma.tbClassEnrollment.findMany({
            where: { classId: test.lesson.classId, studentId: { in: results.map((r) => r.studentId) } },
        });
        const notifs: Prisma.PrismaPromise<any>[] = [];
        for (const r of results) {
            notifs.push(
                this.prisma.tbNotification.create({
                    data: {
                        userId: r.studentId,
                        message: `'${test.title}' 테스트 결과가 등록되었습니다. (${r.score}/${test.maxScore}점)`,
                        type: 'test',
                        referenceId: testId,
                        referenceType: 'test',
                    },
                }),
            );
            const enrollment = enrollments.find((e) => e.studentId === r.studentId);
            if (enrollment?.parentId) {
                notifs.push(
                    this.prisma.tbNotification.create({
                        data: {
                            userId: enrollment.parentId,
                            message: `자녀의 '${test.title}' 테스트 결과: ${r.score}/${test.maxScore}점`,
                            type: 'test',
                            referenceId: testId,
                            referenceType: 'test',
                        },
                    }),
                );
            }
        }
        if (notifs.length > 0) await this.prisma.$transaction(notifs);

        return saved;
    }

    async getTestResults(teacherId: string, testId: string) {
        const test = await this.prisma.tbTest.findUnique({
            where: { id: testId },
            include: { lesson: { select: { classId: true } } },
        });
        if (!test) throw new NotFoundException('Test not found');
        await this.ensureTeacherOwnsClass(teacherId, test.lesson.classId);

        const results = await this.prisma.tbTestResult.findMany({
            where: { testId },
            include: { student: { select: { id: true, username: true, avatarUrl: true } } },
            orderBy: { score: 'desc' },
        });

        const avg = results.length > 0
            ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
            : 0;

        return { test, results, classAverage: avg };
    }

    // ===== ASSIGNMENTS (과제 출제 & 채점) =====

    async createAssignment(teacherId: string, classId: string, data: {
        lessonId: string; title: string; description?: string; dueDate?: string; fileUrl?: string;
    }) {
        await this.ensureTeacherOwnsClass(teacherId, classId);

        const assignment = await this.prisma.tbAssignment.create({
            data: {
                lessonId: data.lessonId,
                title: data.title,
                description: data.description,
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
                fileUrl: data.fileUrl,
            },
        });

        // Create pending submissions for all enrolled students
        const enrollments = await this.prisma.tbClassEnrollment.findMany({
            where: { classId },
        });
        if (enrollments.length > 0) {
            await this.prisma.tbAssignmentSubmission.createMany({
                data: enrollments.map((e) => ({
                    assignmentId: assignment.id,
                    studentId: e.studentId,
                    status: 'pending' as const,
                })),
            });

            // Notify students
            const notifs = enrollments.map((e) =>
                this.prisma.tbNotification.create({
                    data: {
                        userId: e.studentId,
                        message: `새 과제 '${data.title}'이 출제되었습니다.${data.dueDate ? ` 마감: ${data.dueDate}` : ''}`,
                        type: 'assignment',
                        referenceId: assignment.id,
                        referenceType: 'assignment',
                    },
                }),
            );
            await this.prisma.$transaction(notifs);
        }

        // 공유 스케줄에 동기화 (수강생별)
        const lesson = await this.prisma.tbLessonPlan.findUnique({
            where: { id: data.lessonId },
            include: { class: { select: { name: true, subject: true } } },
        });
        if (lesson) {
            this.syncEventForClassStudents(classId, assignment.id, 'assignment', assignment, lesson);
        }

        return assignment;
    }

    async gradeSubmission(teacherId: string, submissionId: string, data: {
        grade?: number; feedback?: string; status?: 'graded';
    }) {
        const submission = await this.prisma.tbAssignmentSubmission.findUnique({
            where: { id: submissionId },
            include: { assignment: { include: { lesson: { select: { classId: true } } } } },
        });
        if (!submission) throw new NotFoundException('Submission not found');
        await this.ensureTeacherOwnsClass(teacherId, submission.assignment.lesson.classId);

        return this.prisma.tbAssignmentSubmission.update({
            where: { id: submissionId },
            data: {
                grade: data.grade,
                feedback: data.feedback,
                status: data.status || 'graded',
            },
        });
    }

    async getAssignmentSubmissions(teacherId: string, assignmentId: string) {
        const assignment = await this.prisma.tbAssignment.findUnique({
            where: { id: assignmentId },
            include: { lesson: { select: { classId: true } } },
        });
        if (!assignment) throw new NotFoundException('Assignment not found');
        await this.ensureTeacherOwnsClass(teacherId, assignment.lesson.classId);

        return this.prisma.tbAssignmentSubmission.findMany({
            where: { assignmentId },
            include: {
                student: { select: { id: true, username: true, avatarUrl: true } },
            },
            orderBy: { student: { username: 'asc' } },
        });
    }

    // ===== PRIVATE COMMENTS (비공개 코멘트) =====

    async createPrivateComment(teacherId: string, data: {
        targetId: string; studentId?: string; contextType?: string; contextId?: string;
        content: string; imageUrl?: string;
    }) {
        const comment = await this.prisma.tbPrivateComment.create({
            data: {
                authorId: teacherId,
                targetId: data.targetId,
                studentId: data.studentId,
                contextType: data.contextType,
                contextId: data.contextId,
                content: data.content,
                imageUrl: data.imageUrl,
            },
        });

        // Notify the parent
        await this.prisma.tbNotification.create({
            data: {
                userId: data.targetId,
                message: '선생님이 새로운 비공개 코멘트를 남겼습니다.',
                type: 'comment',
                referenceId: comment.id,
                referenceType: 'comment',
            },
        });

        return comment;
    }

    async getPrivateComments(teacherId: string, studentId: string) {
        return this.prisma.tbPrivateComment.findMany({
            where: {
                OR: [
                    { authorId: teacherId, studentId },
                    { targetId: teacherId, studentId },
                ],
            },
            include: {
                author: { select: { id: true, username: true, role: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ===== TEACHER DASHBOARD =====

    async getTeacherDashboard(teacherId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [classes, todayLessons, pendingSubmissions, todayAttendance] = await Promise.all([
            // My classes count + students
            this.prisma.tbClass.findMany({
                where: { teacherId },
                include: { _count: { select: { enrollments: true } } },
            }),

            // Today's lesson plans
            this.prisma.tbLessonPlan.findMany({
                where: {
                    class: { teacherId },
                    scheduledDate: { gte: today, lt: tomorrow },
                },
                include: { class: { select: { name: true } } },
            }),

            // Pending assignment submissions (ungraded)
            this.prisma.tbAssignmentSubmission.findMany({
                where: {
                    status: 'submitted',
                    assignment: { lesson: { class: { teacherId } } },
                },
                include: {
                    student: { select: { username: true } },
                    assignment: { select: { title: true } },
                },
            }),

            // Today's attendance summary
            this.prisma.tbAttendance.findMany({
                where: {
                    class: { teacherId },
                    date: { gte: today, lt: tomorrow },
                },
            }),
        ]);

        const totalStudents = classes.reduce((sum, c) => sum + c._count.enrollments, 0);
        const attendanceSummary = {
            present: todayAttendance.filter((a) => a.status === 'present').length,
            late: todayAttendance.filter((a) => a.status === 'late').length,
            absent: todayAttendance.filter((a) => a.status === 'absent').length,
        };

        return {
            classCount: classes.length,
            totalStudents,
            todayLessons,
            pendingSubmissions: pendingSubmissions.length,
            pendingSubmissionsList: pendingSubmissions.slice(0, 10),
            attendanceSummary,
        };
    }

    // ===== HELPERS =====

    private async ensureTeacherOwnsClass(teacherId: string, classId: string) {
        const cls = await this.prisma.tbClass.findFirst({
            where: { id: classId, teacherId },
        });
        if (!cls) throw new ForbiddenException('Access denied: not your class');
        return cls;
    }

    /**
     * 클래스 수강생별로 공유 스케줄에 이벤트 동기화 (비동기, fire-and-forget)
     */
    private async syncEventForClassStudents(
        classId: string,
        sourceId: string,
        eventType: 'assignment' | 'test',
        event: { title: string; dueDate?: Date | null; testDate?: Date | null },
        lesson: { title: string; class: { name: string; subject?: string | null } },
    ) {
        try {
            const enrollments = await this.prisma.tbClassEnrollment.findMany({
                where: { classId },
                include: { student: { select: { hubUserId: true } } },
            });

            for (const enrollment of enrollments) {
                const hubUserId = enrollment.student.hubUserId;
                if (!hubUserId) continue;

                if (eventType === 'assignment') {
                    await this.sharedSchedule.syncAssignment(
                        String(hubUserId),
                        { id: sourceId, title: event.title, dueDate: event.dueDate },
                        { title: lesson.title, class: { name: lesson.class.name, subject: lesson.class.subject || undefined } },
                    );
                } else {
                    await this.sharedSchedule.syncTest(
                        String(hubUserId),
                        { id: sourceId, title: event.title, testDate: event.testDate },
                        { title: lesson.title, class: { name: lesson.class.name, subject: lesson.class.subject || undefined } },
                    );
                }
            }
        } catch (error) {
            this.logger.error(`Failed to sync ${eventType} ${sourceId} for class ${classId}`, error);
        }
    }
}
