import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class CreateOrderItemDto {
    @ApiProperty({ example: 'uuid-product-id', description: 'Product ID' })
    @IsUUID()
    productId: string;

    @ApiProperty({ example: 2, description: 'Quantity (minimum 1)' })
    @IsInt()
    @Min(1)
    quantity: number;
}
