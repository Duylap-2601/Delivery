import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register';
import { LoginDto } from './dto/login';
import { Public } from '../../common/decorator/public.decorator';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { JwtAuthGuard } from '../../common/guard/jwt-auth.guard';

const REFRESH_TOKEN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 ngày (ms)
const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';



@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    // ─── Local Auth ───────────────────────────────────────────────────────────

    @Public()
    @Post('register')
    @ApiOperation({ summary: 'Register a new user account — sends a verification email' })
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Public()
    @Get('verify-email')
    @ApiOperation({ summary: 'Verify email from the link sent to the user inbox' })
    verifyEmail(@Query('token') token: string) {
        return this.authService.verifyEmail(token);
    }

    @Public()
    @Post('resend-verification')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Resend verification email if not yet confirmed' })
    resendVerification(@Body('email') email: string) {
        return this.authService.resendVerificationEmail(email);
    }

    @Public()
    @Post('login')
    @ApiOperation({ summary: 'Login – sets HttpOnly refresh token cookie, returns accessToken + user' })
    async login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { accessToken, refreshToken, user } = await this.authService.login(dto);

        res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
            path: '/',
        });

        return { accessToken, user };
    }

    @Public()
    @Post('refresh')
    @ApiOperation({ summary: 'Use refresh token to get a new access token – reads/writes via HttpOnly Cookie' })
    async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const token = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] as string | undefined;
        if (!token) throw new UnauthorizedException('Refresh token cookie missing');

        const { accessToken, refreshToken: newRefreshToken } = await this.authService.refreshToken(token);

        res.cookie(REFRESH_TOKEN_COOKIE_NAME, newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
            path: '/',
        });

        return { accessToken };
    }

    @Public()
    @Post('logout')
    @ApiOperation({ summary: 'Logout – invalidates the refresh token and clears the cookie' })
    async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const token = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] as string | undefined;
        if (token) {
            await this.authService.logout(token);
        }

        res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { path: '/' });
        return { message: 'Logged out successfully' };
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get the currently authenticated user' })
    getMe(@CurrentUser() user: any) {
        return this.authService.getMe(user.id);
    }

    // ─── Google OAuth ─────────────────────────────────────────────────────────

    @Public()
    @Get('google')
    @UseGuards(AuthGuard('google'))
    @ApiOperation({ summary: 'Redirect to Google OAuth consent screen' })
    googleLogin() { }

    @Public()
    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    @ApiOperation({ summary: 'Google OAuth callback – redirects with JWT (add ?debug=true to get JSON instead)' })
    async googleCallback(
        @Req() req: Request,
        @Res() res: Response,
        @Query('state') state?: string,
    ) {
        const { accessToken, refreshToken } = await this.authService.signOAuthUser(req.user as any);

        // DEBUG MODE: return JSON directly (useful when testing without a frontend)
        const isDebug = state === 'debug';
        if (isDebug || process.env.NODE_ENV !== 'production') {
            res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
                path: '/',
            });
            return res.json({ accessToken, refreshToken, message: 'OAuth success (debug mode)' });
        }

        const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
        return res.redirect(
            `${frontendUrl}/oauth-callback?accessToken=${accessToken}&refreshToken=${refreshToken}`,
        );
    }

    // ─── Facebook OAuth ───────────────────────────────────────────────────────

    @Public()
    @Get('facebook')
    @UseGuards(AuthGuard('facebook'))
    @ApiOperation({ summary: 'Redirect to Facebook OAuth consent screen' })
    facebookLogin() { }

    @Public()
    @Get('facebook/callback')
    @UseGuards(AuthGuard('facebook'))
    @ApiOperation({ summary: 'Facebook OAuth callback – redirects with JWT (returns JSON in non-production)' })
    async facebookCallback(@Req() req: Request, @Res() res: Response) {
        const { accessToken, refreshToken } = await this.authService.signOAuthUser(req.user as any);

        // DEBUG MODE: return JSON directly (useful when testing without a frontend)
        if (process.env.NODE_ENV !== 'production') {
            res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
                path: '/',
            });
            return res.json({ accessToken, refreshToken, message: 'OAuth success (debug mode)' });
        }

        const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3001';
        return res.redirect(
            `${frontendUrl}/oauth-callback?accessToken=${accessToken}&refreshToken=${refreshToken}`,
        );
    }
}
