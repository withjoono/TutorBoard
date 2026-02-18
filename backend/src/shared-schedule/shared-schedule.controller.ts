import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { SharedScheduleService } from './shared-schedule.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('shared-schedule')
export class SharedScheduleController {
  constructor(private readonly sharedScheduleService: SharedScheduleService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getMySchedule(
    @Request() req: any,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const hubUserId = req.user.hubUserId || req.user.sub;
    return this.sharedScheduleService.getMySchedule(String(hubUserId), start, end);
  }
}
