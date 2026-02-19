import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentService {
    constructor(private prisma: PrismaService) { }

    // ===== 수업 기록 테이블 (공유 테이블) =====
    // 날짜별 출결/수업내용/과제결과/다음과제/테스트 결과를 테이블 형태로 반환
    async getClassRecords(classId: string, userId: string) {
        // 접근 권한 확인
        await this.verifyAccess(classId, userId);

        const tbClass = await this.prisma.tbClass.findUnique({
            where: { id: classId },
            select: { id: true, name: true, subject: true, teacherId: true },
        });
        if (!tbClass) throw new NotFoundException('Class not found');

        // 수업 계획 + 기록 + 과제 + 시험
        const lessonPlans = await this.prisma.tbLessonPlan.findMany({
            where: { classId },
            include: {
                records: {
                    orderBy: { recordDate: 'desc' },
                },
                assignments: {
                    include: {
                        submissions: {
                            where: { studentId: userId },
                            select: { status: true, grade: true, feedback: true },
                        },
                    },
                },
                tests: {
                    include: {
                        results: {
                            where: { studentId: userId },
                            select: { score: true, feedback: true },
                        },
                    },
                },
            },
            orderBy: { scheduledDate: 'desc' },
        });

        // 출결 정보
        const attendances = await this.prisma.tbAttendance.findMany({
            where: { classId, studentId: userId },
            orderBy: { date: 'desc' },
        });
        const attendanceMap = new Map(
            attendances.map((a) => [a.date.toISOString().split('T')[0], a]),
        );

        // 테이블 행 생성
        const rows: any[] = [];
        for (const plan of lessonPlans) {
            for (const record of plan.records) {
                const dateStr = record.recordDate.toISOString().split('T')[0];
                const date = new Date(record.recordDate);
                const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];

                const attendance = attendanceMap.get(dateStr);

                // 이 수업의 과제 결과
                const assignmentResults = plan.assignments.map((a) => ({
                    title: a.title,
                    status: a.submissions[0]?.status || 'pending',
                    grade: a.submissions[0]?.grade,
                    feedback: a.submissions[0]?.feedback,
                }));

                // 시험 결과
                const testResults = plan.tests.map((t) => ({
                    title: t.title,
                    score: t.results[0]?.score,
                    maxScore: t.maxScore,
                    feedback: t.results[0]?.feedback,
                }));

                rows.push({
                    date: dateStr,
                    dayOfWeek,
                    time: record.recordDate.toTimeString().substring(0, 5),
                    attendance: attendance?.status || null,
                    content: record.summary || plan.title,
                    pages: record.pagesFrom && record.pagesTo
                        ? `p.${record.pagesFrom}~${record.pagesTo}`
                        : null,
                    conceptNote: record.conceptNote,
                    assignments: assignmentResults,
                    tests: testResults,
                    assignmentResult: assignmentResults[0]?.grade
                        ? `${assignmentResults[0].grade}점`
                        : assignmentResults[0]?.status === 'submitted'
                            ? '제출완료'
                            : null,
                    nextAssignment: plan.assignments.find(
                        (a) => !a.submissions[0] || a.submissions[0].status === 'pending',
                    )?.title || null,
                    testResult: testResults[0]?.score != null
                        ? `${testResults[0].score}/${testResults[0].maxScore}`
                        : null,
                });
            }
        }

        // 날짜순 정렬
        rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
            classInfo: tbClass,
            records: rows,
            summary: {
                totalRecords: rows.length,
                presentCount: attendances.filter((a) => a.status === 'present').length,
                lateCount: attendances.filter((a) => a.status === 'late').length,
                absentCount: attendances.filter((a) => a.status === 'absent').length,
                avgProgress: lessonPlans.length > 0
                    ? Math.round(lessonPlans.reduce((s, p) => s + p.progress, 0) / lessonPlans.length)
                    : 0,
            },
        };
    }

    // ===== 수업별 코멘트 =====
    async getClassComments(classId: string, userId: string) {
        await this.verifyAccess(classId, userId);

        const tbClass = await this.prisma.tbClass.findUnique({
            where: { id: classId },
            select: { teacherId: true },
        });
        if (!tbClass) throw new NotFoundException('Class not found');

        // 이 수업 관련 코멘트 (선생님↔학생↔학부모)
        return this.prisma.tbPrivateComment.findMany({
            where: {
                OR: [
                    { authorId: userId },
                    { targetId: userId },
                    { authorId: tbClass.teacherId, studentId: userId },
                    { targetId: tbClass.teacherId, studentId: userId },
                ],
                contextType: 'class',
                contextId: classId,
            },
            include: {
                author: { select: { id: true, username: true, role: true, avatarUrl: true } },
                target: { select: { id: true, username: true, role: true } },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    async addClassComment(classId: string, userId: string, data: { content: string; targetId?: string }) {
        await this.verifyAccess(classId, userId);

        const tbClass = await this.prisma.tbClass.findUnique({
            where: { id: classId },
            select: { teacherId: true },
        });
        if (!tbClass) throw new NotFoundException('Class not found');

        return this.prisma.tbPrivateComment.create({
            data: {
                authorId: userId,
                targetId: data.targetId || tbClass.teacherId, // 기본: 선생님에게
                studentId: userId,
                contextType: 'class',
                contextId: classId,
                content: data.content,
            },
            include: {
                author: { select: { id: true, username: true, role: true, avatarUrl: true } },
                target: { select: { id: true, username: true, role: true } },
            },
        });
    }

    // ===== 통합 스케줄 (hub_shared_schedule) =====
    async getIntegratedSchedule(userId: string) {
        const user = await this.prisma.tbUser.findUnique({
            where: { id: userId },
            select: { hubUserId: true },
        });

        if (!user?.hubUserId) return [];

        const hubUserId = String(user.hubUserId);

        const events = await this.prisma.hubSharedSchedule.findMany({
            where: { hubUserId },
            orderBy: { eventDate: 'asc' },
        });

        return events.map((e) => ({
            id: Number(e.id),
            source: e.sourceApp,
            type: e.eventType,
            title: e.title,
            date: e.eventDate,
            description: e.description,
            metadata: e.metadata ? JSON.parse(e.metadata as string) : null,
        }));
    }

    // ===== HELPERS =====
    private async verifyAccess(classId: string, userId: string) {
        // 학생 수강 확인
        const enrollment = await this.prisma.tbClassEnrollment.findFirst({
            where: { classId, studentId: userId },
        });
        if (enrollment) return;

        // 학부모 확인
        const parentEnrollment = await this.prisma.tbClassEnrollment.findFirst({
            where: { classId, parentId: userId },
        });
        if (parentEnrollment) return;

        // 선생님 확인
        const cls = await this.prisma.tbClass.findFirst({
            where: { id: classId, teacherId: userId },
        });
        if (cls) return;

        throw new ForbiddenException('Access denied');
    }
}
