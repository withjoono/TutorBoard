import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AssignmentsService } from './assignments.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('assignments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AssignmentsController {
    constructor(private readonly assignmentsService: AssignmentsService) { }

    @Get('my')
    @Roles('student')
    getMyAssignments(@Req() req: any) {
        return this.assignmentsService.getMyAssignments(req.user.id);
    }

    @Get(':id')
    getDetail(@Param('id') id: string, @Req() req: any) {
        return this.assignmentsService.getAssignmentDetail(id, req.user.id);
    }

    @Post(':id/submit')
    @Roles('student')
    submit(
        @Param('id') id: string,
        @Req() req: any,
        @Body('fileUrl') fileUrl: string,
    ) {
        return this.assignmentsService.submitAssignment(req.user.id, id, fileUrl);
    }
}
