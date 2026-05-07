import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
    sub: string;
    email: string;
    roles: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.JWT_SECRET ?? 'super-secret',
            ignoreExpiration: false,
        });
    }

    async validate(payload: JwtPayload) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: { roles: true },
        });

        if (!user) {
            throw new UnauthorizedException('Token is invalid or user no longer exists');
        }

        // Exclude password from the attached user object
        const { password, ...safeUser } = user;
        return safeUser;
    }
}
