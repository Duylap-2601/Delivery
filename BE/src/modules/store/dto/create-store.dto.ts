import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StoreType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateStoreDto {
    @ApiProperty({ example: 'Bún Bò Huế Mẹ Tôi', description: 'Store name' })
    @IsString()
    @IsNotEmpty()
    @Length(2, 100)
    name: string;

    @ApiProperty({ enum: StoreType, example: StoreType.FOOD, description: 'Type of store' })
    @IsEnum(StoreType)
    type: StoreType;

    @ApiProperty({ example: '123 Lê Lợi, Quận 1, TP.HCM', description: 'Physical address of the store' })
    @IsString()
    @IsNotEmpty()
    @Length(5, 255)
    address: string;

    @ApiPropertyOptional({ example: 'Bún bò Huế chuẩn vị miền Trung, nấu từ 1985' })
    @IsOptional()
    @IsString()
    @Length(0, 500)
    description?: string;
}
