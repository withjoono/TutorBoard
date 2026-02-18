import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SharedScheduleService {
  private readonly logger = new Logger(SharedScheduleService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 과제를 공유 스케줄에 동기화
   */
  async syncAssignment(
    hubUserId: string,
    assignment: { id: string; title: string; dueDate?: Date | null; },
    lesson: { title: string; class: { name: string; subject?: string } },
  ) {
    if (!assignment.dueDate) return;

    try {
      await this.prisma.hubSharedSchedule.upsert({
        where: {
          uk_hub_schedule_source: {
            sourceApp: 'tutorboard',
            eventType: 'assignment',
            sourceId: assignment.id,
          },
        },
        create: {
          hubUserId: String(hubUserId),
          sourceApp: 'tutorboard',
          eventType: 'assignment',
          sourceId: assignment.id,
          title: `[과제] ${assignment.title}`,
          description: `${lesson.class.name} - ${lesson.title}`,
          eventDate: assignment.dueDate,
          subject: lesson.class.subject || null,
          metadata: { className: lesson.class.name, lessonTitle: lesson.title },
        },
        update: {
          title: `[과제] ${assignment.title}`,
          description: `${lesson.class.name} - ${lesson.title}`,
          eventDate: assignment.dueDate,
          subject: lesson.class.subject || null,
          metadata: { className: lesson.class.name, lessonTitle: lesson.title },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to sync assignment ${assignment.id}`, error);
    }
  }

  /**
   * 시험을 공유 스케줄에 동기화
   */
  async syncTest(
    hubUserId: string,
    test: { id: string; title: string; testDate?: Date | null; },
    lesson: { title: string; class: { name: string; subject?: string } },
  ) {
    if (!test.testDate) return;

    try {
      await this.prisma.hubSharedSchedule.upsert({
        where: {
          uk_hub_schedule_source: {
            sourceApp: 'tutorboard',
            eventType: 'test',
            sourceId: test.id,
          },
        },
        create: {
          hubUserId: String(hubUserId),
          sourceApp: 'tutorboard',
          eventType: 'test',
          sourceId: test.id,
          title: `[시험] ${test.title}`,
          description: `${lesson.class.name} - ${lesson.title}`,
          eventDate: test.testDate,
          subject: lesson.class.subject || null,
          metadata: { className: lesson.class.name, lessonTitle: lesson.title },
        },
        update: {
          title: `[시험] ${test.title}`,
          description: `${lesson.class.name} - ${lesson.title}`,
          eventDate: test.testDate,
          subject: lesson.class.subject || null,
          metadata: { className: lesson.class.name, lessonTitle: lesson.title },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to sync test ${test.id}`, error);
    }
  }

  /**
   * 공유 스케줄에서 이벤트 삭제
   */
  async removeEvent(eventType: string, sourceId: string) {
    try {
      await this.prisma.hubSharedSchedule.deleteMany({
        where: {
          sourceApp: 'tutorboard',
          eventType,
          sourceId,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to remove ${eventType} ${sourceId}`, error);
    }
  }

  /**
   * 사용자의 통합 스케줄 조회
   */
  async getMySchedule(hubUserId: string, startDate: string, endDate: string) {
    const events = await this.prisma.hubSharedSchedule.findMany({
      where: {
        hubUserId: String(hubUserId),
        eventDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: [{ eventDate: 'asc' }, { startTime: 'asc' }],
    });

    return events.map((e) => ({
      id: Number(e.id),
      sourceApp: e.sourceApp,
      eventType: e.eventType,
      sourceId: e.sourceId,
      title: e.title,
      description: e.description,
      eventDate: e.eventDate,
      startTime: e.startTime,
      endTime: e.endTime,
      subject: e.subject,
      metadata: e.metadata,
    }));
  }
}
