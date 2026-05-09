import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Decorator dùng ở method handler của controller.
 * Ném 403 ngay nếu user chưa xác nhận SĐT.
 *
 * @example
 * @Post()
 * createOrder(@PhoneVerified() user: any, @Body() dto: CreateOrderDto) { ... }
 */
export const PhoneVerified = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.isPhoneVerified) {
        throw new ForbiddenException(
            'Bạn cần xác nhận số điện thoại trước khi đặt hàng. Vui lòng vào POST /api/auth/phone/send-otp.',
        );
    }

    return user;
});
