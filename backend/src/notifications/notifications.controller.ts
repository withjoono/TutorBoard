import { Controller, Get, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    getNotifications(@Req() req: any) {
        return this.notificationsService.getNotifications(req.user.id);
    }

    @Get('unread-count')
    getUnreadCount(@Req() req: any) {
        return this.notificationsService.getUnreadCount(req.user.id);
    }

    @Patch(':id/read')
    markAsRead(@Param('id') id: string, @Req() req: any) {
        return this.notificationsService.markAsRead(id, req.user.id);
    }

    @Patch('read-all')
    markAllAsRead(@Req() req: any) {
        return this.notificationsService.markAllAsRead(req.user.id);
    }
}
