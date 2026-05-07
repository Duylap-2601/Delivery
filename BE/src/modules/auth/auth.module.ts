import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            useFactory: () => ({
                secret: process.env.JWT_SECRET ?? 'super-secret',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as any },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, GoogleStrategy, FacebookStrategy],
    exports: [JwtModule],
})
export class AuthModule {}
