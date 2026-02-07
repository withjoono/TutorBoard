import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClassesService } from './classes.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('classes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ClassesController {
    constructor(private readonly classesService: ClassesService) { }

    @Post()
    @Roles('teacher')
    create(@Req() req: any, @Body() body: { name: string; description?: string }) {
        return this.classesService.create(req.user.id, body);
    }

    @Post('join')
    @Roles('student')
    join(@Req() req: any, @Body('inviteCode') inviteCode: string) {
        return this.classesService.joinByInviteCode(req.user.id, inviteCode);
    }

    @Get('my')
    getMyClasses(@Req() req: any) {
        return this.classesService.getMyClasses(req.user.id);
    }

    @Get(':id')
    getClassDetail(@Param('id') id: string, @Req() req: any) {
        return this.classesService.getClassDetail(id, req.user.id);
    }
}
