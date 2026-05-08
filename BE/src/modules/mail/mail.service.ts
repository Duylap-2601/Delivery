import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;

  async onModuleInit() {
    await this.initTransporter();
  }

  // ─── Khởi tạo transporter ────────────────────────────────────────────────

  private async initTransporter() {
    const smtpUser = process.env.SMTP_USER;

    if (!smtpUser) {
      // Dev mode: dùng Ethereal (fake SMTP — xem mail tại https://ethereal.email)
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      this.logger.warn(
        `[MailService] DEV MODE — Ethereal SMTP: ${testAccount.user} | Preview at https://ethereal.email`,
      );
    } else {
      // Production: dùng SMTP thật (Gmail, SendGrid, Brevo...)
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: smtpUser,
          pass: process.env.SMTP_PASS,
        },
      });
      this.logger.log(`[MailService] SMTP configured: ${smtpUser}`);
    }
  }

  // ─── Gửi mail xác thực email ──────────────────────────────────────────────

  async sendVerificationEmail(to: string, fullName: string, verifyUrl: string): Promise<void> {
    const appName = process.env.APP_NAME ?? 'FoodDelivery';
    const fromAddress = process.env.SMTP_FROM ?? `"${appName}" <no-reply@fooddelivery.dev>`;

    const info = await this.transporter.sendMail({
      from: fromAddress,
      to,
      subject: `[${appName}] Xác nhận địa chỉ email của bạn`,
      html: this.buildVerificationEmailHtml(fullName, verifyUrl, appName),
    });

    // In preview URL khi dùng Ethereal
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      this.logger.log(`[MailService] 📬 Preview email tại: ${previewUrl}`);
    }
  }

  // ─── HTML template ─────────────────────────────────────────────────────────

  private buildVerificationEmailHtml(fullName: string, verifyUrl: string, appName: string): string {
    return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Xác nhận email</title>
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; }
    .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #FF6B35, #FF8C42); padding: 36px 40px; text-align: center; }
    .header h1 { margin: 0; color: #fff; font-size: 26px; letter-spacing: 0.5px; }
    .body { padding: 36px 40px; color: #333; }
    .body p { font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
    .btn { display: inline-block; margin: 24px 0; padding: 14px 36px; background: linear-gradient(135deg, #FF6B35, #FF8C42); color: #fff !important; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px; }
    .note { font-size: 13px; color: #888; margin-top: 20px; }
    .footer { padding: 20px 40px; background: #fafafa; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; }
    .link-fallback { word-break: break-all; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🍜 ${appName}</h1>
    </div>
    <div class="body">
      <p>Xin chào <strong>${fullName || 'bạn'}</strong>,</p>
      <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>${appName}</strong>! Vui lòng nhấn nút bên dưới để xác nhận địa chỉ email và kích hoạt tài khoản của bạn.</p>
      <div style="text-align: center;">
        <a href="${verifyUrl}" class="btn">Xác nhận Email</a>
      </div>
      <p class="note">Link có hiệu lực trong <strong>24 giờ</strong>. Nếu bạn không thực hiện đăng ký này, hãy bỏ qua email này.</p>
      <p class="note link-fallback">Nếu nút không hoạt động, copy link sau vào trình duyệt:<br/>${verifyUrl}</p>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} ${appName}. Đây là email tự động, vui lòng không reply.
    </div>
  </div>
</body>
</html>`;
  }
}
