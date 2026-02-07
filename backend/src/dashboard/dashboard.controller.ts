import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('student')
    getStudentDashboard(@Req() req: any) {
        return this.dashboardService.getStudentDashboard(req.user.id);
    }
}
