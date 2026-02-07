import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TestsService {
    constructor(private prisma: PrismaService) { }

    // 학생: 내 테스트 결과 목록
    async getMyTestResults(studentId: string) {
        return this.prisma.tbTestResult.findMany({
            where: { studentId },
            include: {
                test: {
                    select: {
                        id: true,
                        title: true,
                        testDate: true,
                        maxScore: true,
                        lesson: {
                            select: { title: true, class: { select: { id: true, name: true } } },
                        },
                    },
                },
            },
            orderBy: { takenAt: 'desc' },
        });
    }

    // 학생: 특정 테스트 결과 상세
    async getTestResultDetail(testId: string, studentId: string) {
        const result = await this.prisma.tbTestResult.findUnique({
            where: { testId_studentId: { testId, studentId } },
            include: {
                test: {
                    include: {
                        lesson: { select: { title: true, class: { select: { name: true } } } },
                    },
                },
            },
        });

        if (!result) throw new NotFoundException('Test result not found');
        return result;
    }

    // 학생: 점수 추이 (차트 데이터용)
    async getScoreTrend(studentId: string, classId?: string) {
        const where: any = { studentId };
        if (classId) {
            where.test = { lesson: { classId } };
        }

        const results = await this.prisma.tbTestResult.findMany({
            where,
            include: {
                test: { select: { title: true, maxScore: true, testDate: true } },
            },
            orderBy: { takenAt: 'asc' },
            take: 20,
        });

        return results.map((r) => ({
            testTitle: r.test.title,
            score: r.score,
            maxScore: r.test.maxScore,
            percentage: Math.round((r.score / r.test.maxScore) * 100),
            date: r.test.testDate || r.takenAt,
        }));
    }
}
