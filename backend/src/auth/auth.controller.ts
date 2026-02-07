import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('sso/exchange')
    async exchangeSSOCode(@Body('code') code: string) {
        return this.authService.exchangeSSOCode(code);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('me')
    async getMe(@Req() req: any) {
        return this.authService.getOrCreateUser(req.user);
    }
}
