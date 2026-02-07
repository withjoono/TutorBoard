import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
    constructor(private prisma: PrismaService) { }

    async getNotifications(userId: string, take = 20) {
        return this.prisma.tbNotification.findMany({
            where: { userId },
            orderBy: { sentAt: 'desc' },
            take,
        });
    }

    async markAsRead(notificationId: string, userId: string) {
        return this.prisma.tbNotification.updateMany({
            where: { id: notificationId, userId },
            data: { read: true },
        });
    }

    async markAllAsRead(userId: string) {
        return this.prisma.tbNotification.updateMany({
            where: { userId, read: false },
            data: { read: true },
        });
    }

    async getUnreadCount(userId: string) {
        return this.prisma.tbNotification.count({
            where: { userId, read: false },
        });
    }
}
