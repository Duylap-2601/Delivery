import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name);

    /**
     * Gửi OTP qua SMS.
     * - DEV   (SMS_PROVIDER=dev hoặc không set): chỉ log ra console, không gửi thật.
     * - PROD  (SMS_PROVIDER=esms | twilio ...): gọi API của provider tương ứng.
     */
    async sendOtp(phone: string, otp: string): Promise<void> {
        const provider = process.env.SMS_PROVIDER ?? 'dev';
        const appName = process.env.APP_NAME ?? 'FoodDelivery';
        const message = `[${appName}] Mã xác nhận SĐT của bạn là: ${otp}. Hiệu lực 5 phút. Không chia sẻ mã này với ai.`;

        if (provider === 'dev') {
            // ─── DEV MODE: hiện OTP thẳng ra console ──────────────────────────
            this.logger.warn('─────────────────────────────────────────────');
            this.logger.warn(`📱 [DEV] SMS to: ${phone}`);
            this.logger.warn(`📨 Message: ${message}`);
            this.logger.warn('─────────────────────────────────────────────');
            return;
        }

        // ─── PRODUCTION: tích hợp provider thật sau ──────────────────────────
        // TODO: switch (provider) { case 'esms': ...; case 'twilio': ...; }
        this.logger.warn(`[SmsService] Provider "${provider}" chưa được tích hợp — fallback log`);
        this.logger.warn(`📱 SMS to ${phone}: ${message}`);
    }
}
