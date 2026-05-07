import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthProvider } from '@prisma/client';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(private readonly prisma: PrismaService) {
        super({
            clientID: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            callbackURL: process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3000/api/auth/google/callback',
            scope: ['email', 'profile'],
        });
    }

    async validate(
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: VerifyCallback,
    ) {
        const { id, name, emails, photos } = profile;
        const email = emails?.[0]?.value;
        const fullName = `${name?.givenName ?? ''} ${name?.familyName ?? ''}`.trim();

        let user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { providerId: id, provider: AuthProvider.GOOGLE },
                    { email: email ?? undefined },
                ],
            },
            include: { roles: true },
        });

        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    email: email!,
                    fullName,
                    provider: AuthProvider.GOOGLE,
                    providerId: id,
                },
                include: { roles: true },
            });
        }

        const { password, ...safeUser } = user;
        done(null, safeUser);
    }
}
