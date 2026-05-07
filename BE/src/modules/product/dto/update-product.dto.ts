import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class UpdateProductDto {
    @ApiPropertyOptional({ example: 'Phở bò tái nạm gân' })
    @IsOptional()
    @IsString()
    @Length(2, 150)
    name?: string;

    @ApiPropertyOptional({ example: 'Phở với nước dùng hầm 12 tiếng' })
    @IsOptional()
    @IsString()
    @Length(0, 500)
    description?: string;

    @ApiPropertyOptional({ example: 70000 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;

    @ApiPropertyOptional({ example: 50 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    stock?: number;

    @ApiPropertyOptional({ example: 'https://example.com/images/pho.jpg' })
    @IsOptional()
    @IsString()
    image?: string;

    @ApiPropertyOptional({ example: 'uuid-of-category' })
    @IsOptional()
    @IsUUID()
    categoryId?: string;
}
