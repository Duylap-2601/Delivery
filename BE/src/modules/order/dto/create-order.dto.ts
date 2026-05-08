import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    IsArray,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
} from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
    @ApiProperty({
        type: [CreateOrderItemDto],
        description: 'Danh sách sản phẩm — phải cùng 1 store, tối thiểu 1 item',
    })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateOrderItemDto)
    items: CreateOrderItemDto[];

    @ApiProperty({ example: '123 Lê Lợi, Q.1, TP.HCM', description: 'Địa chỉ giao hàng' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    shippingAddress: string;

    @ApiPropertyOptional({ example: 'Giao trước 12h, gọi trước khi đến', description: 'Ghi chú tuỳ chọn' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    note?: string;
}
