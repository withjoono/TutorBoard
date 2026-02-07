import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService) { }

    async exchangeSSOCode(code: string) {
        // Exchange SSO code with Hub Backend
        const hubApiUrl = process.env.HUB_API_URL || 'http://localhost:4000';
        const serviceId = process.env.SERVICE_ID || 'tutorboard';

        try {
            const response = await fetch(`${hubApiUrl}/auth/sso/verify-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, serviceId }),
            });

            if (!response.ok) {
                throw new HttpException('SSO verification failed', HttpStatus.UNAUTHORIZED);
            }

            const result = await response.json();
            const data = result.data || result;

            // Ensure user exists in our DB
            if (data.accessToken) {
                return {
                    success: true,
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken,
                };
            }

            throw new HttpException('Invalid SSO response', HttpStatus.BAD_REQUEST);
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new HttpException('Hub SSO service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
        }
    }

    async getOrCreateUser(jwtPayload: {
        hubUserId: number;
        email: string;
        username: string;
        role?: string;
    }) {
        let user = await this.prisma.tbUser.findUnique({
            where: { hubUserId: jwtPayload.hubUserId },
        });

        if (!user) {
            user = await this.prisma.tbUser.create({
                data: {
                    hubUserId: jwtPayload.hubUserId,
                    email: jwtPayload.email,
                    username: jwtPayload.username,
                    role: (jwtPayload.role as any) || 'student',
                },
            });
        }

        return user;
    }
}
