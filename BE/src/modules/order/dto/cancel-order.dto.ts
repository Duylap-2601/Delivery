import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelOrderDto {
    @ApiPropertyOptional({ example: 'Tôi đặt nhầm sản phẩm', description: 'Lý do huỷ đơn' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}
