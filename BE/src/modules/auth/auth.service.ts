import {
    BadRequestException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register';
import { LoginDto } from './dto/login';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) {}

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private buildJwtPayload(user: { id: string; email: string; roles: { name: string }[] }) {
        return {
            sub: user.id,
            email: user.email,
            roles: user.roles.map((r) => r.name),
        };
    }

    private generateAccessToken(user: { id: string; email: string; roles: { name: string }[] }) {
        return this.jwtService.sign(this.buildJwtPayload(user), {
            secret: process.env.JWT_SECRET ?? 'super-secret',
            expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as any,
        });
    }

    private generateRawRefreshToken(): string {
        // Cryptographically secure random token
        return crypto.randomBytes(64).toString('hex');
    }

    private async storeRefreshToken(userId: string, rawToken: string): Promise<string> {
        const hashed = await bcrypt.hash(rawToken, 10);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        await this.prisma.token.create({
            data: {
                userId,
                refreshToken: hashed,
                expiresAt,
            },
        });

        return rawToken; // return the raw token (to send to client)
    }

    private buildAuthResponse(
        user: { id: string; email: string; roles: { name: string }[]; [key: string]: any },
        rawRefreshToken: string,
    ) {
        const { password, ...safeUser } = user as any;
        return {
            accessToken: this.generateAccessToken(user),
            refreshToken: rawRefreshToken,
            user: safeUser,
        };
    }

    /** Used by OAuth callbacks to generate tokens for an already-validated user */
    async signOAuthUser(user: { id: string; email: string; roles: { name: string }[] }) {
        const rawRefreshToken = this.generateRawRefreshToken();
        await this.storeRefreshToken(user.id, rawRefreshToken);
        return {
            accessToken: this.generateAccessToken(user),
            refreshToken: rawRefreshToken,
        };
    }

    // ─── Local Auth ───────────────────────────────────────────────────────────

    async register(dto: RegisterDto) {
        if (dto.password !== dto.confirmPassword) {
            throw new BadRequestException('Passwords do not match');
        }

        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existing) {
            throw new BadRequestException('Email is already in use');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                fullName: dto.full_name,
                phone: dto.phone,
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                createdAt: true,
            },
        });

        return { message: 'Registration successful', user };
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.identifier },
            include: { roles: true },
        });

        if (!user || !user.password) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const rawRefreshToken = this.generateRawRefreshToken();
        await this.storeRefreshToken(user.id, rawRefreshToken);
        return this.buildAuthResponse(user, rawRefreshToken);
    }

    async refreshToken(rawRefreshToken: string) {
        // Find all non-expired tokens and check which one matches
        const tokens = await this.prisma.token.findMany({
            where: {
                expiresAt: { gt: new Date() },
            },
            include: {
                user: { include: { roles: true } },
            },
        });

        let matchedToken: (typeof tokens)[0] | null = null;
        for (const token of tokens) {
            const isMatch = await bcrypt.compare(rawRefreshToken, token.refreshToken);
            if (isMatch) {
                matchedToken = token;
                break;
            }
        }

        if (!matchedToken) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        // Rotate: delete old token and issue new pair
        await this.prisma.token.delete({
            where: { id: matchedToken.id },
        });

        const user = matchedToken.user;
        const newRawRefreshToken = this.generateRawRefreshToken();
        await this.storeRefreshToken(user.id, newRawRefreshToken);

        return this.buildAuthResponse(user, newRawRefreshToken);
    }

    async logout(rawRefreshToken: string) {
        // Find and delete the matching token
        const tokens = await this.prisma.token.findMany({
            where: { expiresAt: { gt: new Date() } },
        });

        for (const token of tokens) {
            const isMatch = await bcrypt.compare(rawRefreshToken, token.refreshToken);
            if (isMatch) {
                await this.prisma.token.delete({ where: { id: token.id } });
                return { message: 'Logged out successfully' };
            }
        }

        throw new UnauthorizedException('Invalid refresh token');
    }

    async getMe(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                provider: true,
                createdAt: true,
                roles: { select: { id: true, name: true } },
            },
        });

        if (!user) throw new UnauthorizedException('User not found');
        return user;
    }
}
