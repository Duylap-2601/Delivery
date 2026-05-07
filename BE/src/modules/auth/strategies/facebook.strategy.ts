import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthProvider } from '@prisma/client';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
    constructor(private readonly prisma: PrismaService) {
        super({
            clientID: process.env.FACEBOOK_APP_ID!,
            clientSecret: process.env.FACEBOOK_APP_SECRET!,
            callbackURL: process.env.FACEBOOK_CALLBACK_URL ?? 'http://localhost:3000/api/auth/facebook/callback',
            profileFields: ['id', 'emails', 'name', 'displayName'],
            scope: ['email'],
        });
    }

    async validate(
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: (err: any, user?: any) => void,
    ) {
        const { id, name, emails } = profile;
        const email = emails?.[0]?.value;
        const fullName = `${name?.givenName ?? ''} ${name?.familyName ?? ''}`.trim()
            || profile.displayName;

        let user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { providerId: id, provider: AuthProvider.FACEBOOK },
                    ...(email ? [{ email }] : []),
                ],
            },
            include: { roles: true },
        });

        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    email: email ?? `fb_${id}@noemail.com`, // Facebook may not return email
                    fullName,
                    provider: AuthProvider.FACEBOOK,
                    providerId: id,
                },
                include: { roles: true },
            });
        }

        const { password, ...safeUser } = user;
        done(null, safeUser);
    }
}
