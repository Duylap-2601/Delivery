import {
    BadRequestException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register';
import { LoginDto } from './dto/login';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly mailService: MailService,
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
        return crypto.randomBytes(64).toString('hex');
    }

    private async storeRefreshToken(userId: string, rawToken: string): Promise<string> {
        const hashed = await bcrypt.hash(rawToken, 10);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        await this.prisma.token.create({
            data: { userId, refreshToken: hashed, expiresAt },
        });

        return rawToken;
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

        // Tạo user với status PENDING, chưa verify email
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                fullName: dto.full_name,
                phone: dto.phone,
                status: 'PENDING',
                isEmailVerified: false,
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                createdAt: true,
            },
        });

        // Tạo token xác thực email và gửi mail
        await this.sendVerificationEmail(user.id, user.email, user.fullName ?? '');

        return {
            message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.',
            user,
        };
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

        // Chặn login nếu email chưa verified
        if (!user.isEmailVerified) {
            throw new UnauthorizedException(
                'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư và click link xác nhận.',
            );
        }

        const rawRefreshToken = this.generateRawRefreshToken();
        await this.storeRefreshToken(user.id, rawRefreshToken);
        return this.buildAuthResponse(user, rawRefreshToken);
    }

    async refreshToken(rawRefreshToken: string) {
        const tokens = await this.prisma.token.findMany({
            where: { expiresAt: { gt: new Date() } },
            include: { user: { include: { roles: true } } },
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

        await this.prisma.token.delete({ where: { id: matchedToken.id } });

        const user = matchedToken.user;
        const newRawRefreshToken = this.generateRawRefreshToken();
        await this.storeRefreshToken(user.id, newRawRefreshToken);

        return this.buildAuthResponse(user, newRawRefreshToken);
    }

    async logout(rawRefreshToken: string) {
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
                isEmailVerified: true,
                isPhoneVerified: true,
                status: true,
                createdAt: true,
                roles: { select: { id: true, name: true } },
            },
        });

        if (!user) throw new UnauthorizedException('User not found');
        return user;
    }

    // ─── Email Verification ───────────────────────────────────────────────────

    /** Tạo token và gửi email xác thực */
    async sendVerificationEmail(userId: string, email: string, fullName: string): Promise<void> {
        // Xoá token cũ nếu có (cho phép gửi lại)
        await this.prisma.emailVerification.deleteMany({ where: { userId } });

        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24h

        await this.prisma.emailVerification.create({
            data: { userId, token, expiresAt },
        });

        const baseUrl = process.env.APP_URL ?? 'http://localhost:3000';
        const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

        await this.mailService.sendVerificationEmail(email, fullName, verifyUrl);
    }

    /** Xác nhận token từ link email */
    async verifyEmail(token: string) {
        const record = await this.prisma.emailVerification.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!record) {
            throw new BadRequestException('Link xác nhận không hợp lệ.');
        }

        if (record.expiresAt < new Date()) {
            // Xoá token hết hạn
            await this.prisma.emailVerification.delete({ where: { token } });
            throw new BadRequestException('Link xác nhận đã hết hạn. Vui lòng yêu cầu gửi lại email.');
        }

        // Cập nhật user
        await this.prisma.user.update({
            where: { id: record.userId },
            data: {
                isEmailVerified: true,
                status: 'ACTIVE',
            },
        });

        // Xoá token đã dùng
        await this.prisma.emailVerification.delete({ where: { token } });

        return { message: 'Email đã được xác nhận thành công! Bạn có thể đăng nhập ngay.' };
    }

    /** Gửi lại email xác nhận (nếu user chưa verify) */
    async resendVerificationEmail(email: string) {
        const user = await this.prisma.user.findUnique({ where: { email } });

        if (!user) {
            // Không reveal thông tin user tồn tại hay không
            return { message: 'Nếu email tồn tại, chúng tôi đã gửi lại email xác nhận.' };
        }

        if (user.isEmailVerified) {
            throw new BadRequestException('Email này đã được xác nhận rồi.');
        }

        await this.sendVerificationEmail(user.id, user.email, user.fullName ?? '');

        return { message: 'Email xác nhận đã được gửi lại. Vui lòng kiểm tra hộp thư.' };
    }
}
