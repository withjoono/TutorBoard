import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { nanoid } from 'nanoid';

@Injectable()
export class ClassesService {
    constructor(private prisma: PrismaService) { }

    // 선생님: 클래스 생성
    async create(teacherId: string, data: { name: string; description?: string; startDate?: Date; endDate?: Date }) {
        const inviteCode = nanoid(8).toUpperCase();
        return this.prisma.tbClass.create({
            data: {
                teacherId,
                name: data.name,
                description: data.description,
                startDate: data.startDate,
                endDate: data.endDate,
                inviteCode,
            },
        });
    }

    // 학생: 초대 코드로 클래스 참여
    async joinByInviteCode(studentId: string, inviteCode: string, parentId?: string) {
        const tbClass = await this.prisma.tbClass.findUnique({
            where: { inviteCode },
        });
        if (!tbClass) throw new NotFoundException('Invalid invite code');

        return this.prisma.tbClassEnrollment.create({
            data: {
                classId: tbClass.id,
                studentId,
                parentId,
            },
        });
    }

    // 학생: 내 클래스 목록
    async getMyClasses(studentId: string) {
        const enrollments = await this.prisma.tbClassEnrollment.findMany({
            where: { studentId },
            include: {
                class: {
                    include: {
                        teacher: { select: { id: true, username: true, avatarUrl: true } },
                        lessonPlans: { select: { id: true, progress: true } },
                    },
                },
            },
        });

        return enrollments.map((e) => ({
            ...e.class,
            averageProgress: e.class.lessonPlans.length > 0
                ? Math.round(e.class.lessonPlans.reduce((sum, lp) => sum + lp.progress, 0) / e.class.lessonPlans.length)
                : 0,
            enrolledAt: e.enrolledAt,
        }));
    }

    // 클래스 상세 (진도 포함)
    async getClassDetail(classId: string, userId: string) {
        const enrollment = await this.prisma.tbClassEnrollment.findFirst({
            where: { classId, studentId: userId },
        });

        if (!enrollment) {
            // 선생님 접근 확인
            const cls = await this.prisma.tbClass.findFirst({
                where: { id: classId, teacherId: userId },
            });
            if (!cls) throw new ForbiddenException('Access denied');
        }

        return this.prisma.tbClass.findUnique({
            where: { id: classId },
            include: {
                teacher: { select: { id: true, username: true, avatarUrl: true } },
                lessonPlans: {
                    orderBy: { scheduledDate: 'asc' },
                    include: {
                        assignments: { select: { id: true, title: true, dueDate: true } },
                        tests: { select: { id: true, title: true, testDate: true } },
                    },
                },
            },
        });
    }
}
