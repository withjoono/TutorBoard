import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        const secret = process.env.JWT_SECRET || '';
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: Buffer.from(secret, 'base64').toString('utf8'),
            algorithms: ['HS512'],
        });
    }

    async validate(payload: any) {
        return {
            hubUserId: payload.sub,
            email: payload.email,
            username: payload.username,
            role: payload.role,
        };
    }
}
