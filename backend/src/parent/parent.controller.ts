import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ParentService } from './parent.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('parent')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('parent')
export class ParentController {
    constructor(private readonly parentService: ParentService) { }

    @Get('dashboard')
    getDashboard(@Req() req: any) {
        return this.parentService.getParentDashboard(req.user.id);
    }

    @Get('children/:childId/attendance')
    getChildAttendance(
        @Req() req: any,
        @Param('childId') childId: string,
        @Query('month') month?: string,
    ) {
        return this.parentService.getChildAttendance(req.user.id, childId, month);
    }

    @Get('children/:childId/timeline')
    getChildTimeline(
        @Req() req: any,
        @Param('childId') childId: string,
        @Query('classId') classId?: string,
    ) {
        return this.parentService.getChildTimeline(req.user.id, childId, classId);
    }

    @Get('children/:childId/test-trend')
    getChildTestTrend(
        @Req() req: any,
        @Param('childId') childId: string,
        @Query('classId') classId?: string,
    ) {
        return this.parentService.getChildTestTrend(req.user.id, childId, classId);
    }

    @Get('children/:childId/comments')
    getPrivateComments(
        @Req() req: any,
        @Param('childId') childId: string,
    ) {
        return this.parentService.getPrivateComments(req.user.id, childId);
    }

    @Post('comments/reply')
    replyToComment(
        @Req() req: any,
        @Body() body: {
            targetId: string; studentId: string;
            contextType?: string; contextId?: string; content: string;
        },
    ) {
        return this.parentService.replyToComment(req.user.id, body);
    }
}
