import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TestsService } from './tests.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('tests')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TestsController {
    constructor(private readonly testsService: TestsService) { }

    @Get('my/results')
    @Roles('student')
    getMyResults(@Req() req: any) {
        return this.testsService.getMyTestResults(req.user.id);
    }

    @Get('my/trend')
    @Roles('student')
    getScoreTrend(@Req() req: any, @Query('classId') classId?: string) {
        return this.testsService.getScoreTrend(req.user.id, classId);
    }

    @Get(':testId/result')
    getResultDetail(@Param('testId') testId: string, @Req() req: any) {
        return this.testsService.getTestResultDetail(testId, req.user.id);
    }
}
