import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssignmentsService {
    constructor(private prisma: PrismaService) { }

    // 학생: 내 과제 목록 (모든 클래스)
    async getMyAssignments(studentId: string) {
        const enrollments = await this.prisma.tbClassEnrollment.findMany({
            where: { studentId },
            select: { classId: true },
        });

        const classIds = enrollments.map((e) => e.classId);

        const assignments = await this.prisma.tbAssignment.findMany({
            where: {
                lesson: { classId: { in: classIds } },
            },
            include: {
                lesson: {
                    select: { id: true, title: true, class: { select: { id: true, name: true } } },
                },
                submissions: {
                    where: { studentId },
                    select: { id: true, status: true, grade: true, feedback: true, submittedAt: true },
                },
            },
            orderBy: { dueDate: 'asc' },
        });

        return assignments.map((a) => ({
            id: a.id,
            title: a.title,
            description: a.description,
            dueDate: a.dueDate,
            fileUrl: a.fileUrl,
            className: a.lesson.class.name,
            lessonTitle: a.lesson.title,
            submission: a.submissions[0] || null,
            isOverdue: a.dueDate && new Date(a.dueDate) < new Date() && (!a.submissions[0] || a.submissions[0].status === 'pending'),
        }));
    }

    // 학생: 과제 제출
    async submitAssignment(studentId: string, assignmentId: string, fileUrl: string) {
        const assignment = await this.prisma.tbAssignment.findUnique({
            where: { id: assignmentId },
            include: { lesson: { select: { classId: true } } },
        });
        if (!assignment) throw new NotFoundException('Assignment not found');

        // 접근 권한 확인
        const enrollment = await this.prisma.tbClassEnrollment.findFirst({
            where: { studentId, classId: assignment.lesson.classId },
        });
        if (!enrollment) throw new ForbiddenException('Not enrolled in this class');

        return this.prisma.tbAssignmentSubmission.upsert({
            where: {
                assignmentId_studentId: { assignmentId, studentId },
            },
            create: {
                assignmentId,
                studentId,
                submissionFileUrl: fileUrl,
                status: 'submitted',
            },
            update: {
                submissionFileUrl: fileUrl,
                status: 'submitted',
                submittedAt: new Date(),
            },
        });
    }

    // 학생: 과제 상세 + 피드백
    async getAssignmentDetail(assignmentId: string, studentId: string) {
        const assignment = await this.prisma.tbAssignment.findUnique({
            where: { id: assignmentId },
            include: {
                lesson: {
                    select: { id: true, title: true, class: { select: { id: true, name: true } } },
                },
                submissions: {
                    where: { studentId },
                },
            },
        });

        if (!assignment) throw new NotFoundException('Assignment not found');
        return {
            ...assignment,
            submission: assignment.submissions[0] || null,
        };
    }
}
