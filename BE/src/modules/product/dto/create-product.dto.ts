import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Length,
    Min,
} from 'class-validator';

export class CreateProductDto {
    @ApiProperty({ example: 'Bún bò Huế đặc biệt' })
    @IsString()
    @IsNotEmpty()
    @Length(2, 150)
    name: string;

    @ApiPropertyOptional({ example: 'Bún bò Huế với đầy đủ topping: chả, bắp bò, giò heo' })
    @IsOptional()
    @IsString()
    @Length(0, 500)
    description?: string;

    @ApiProperty({ example: 65000, description: 'Price in VND' })
    @IsNumber()
    @Min(0)
    price: number;

    @ApiPropertyOptional({ example: 100, description: 'Stock quantity (default: 0)' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    stock?: number;

    @ApiPropertyOptional({ example: 'https://example.com/images/bun-bo.jpg' })
    @IsOptional()
    @IsString()
    image?: string;

    @ApiProperty({ example: 'uuid-of-category', description: 'Category ID' })
    @IsUUID()
    categoryId: string;
}
