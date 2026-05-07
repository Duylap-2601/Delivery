import { ApiPropertyOptional } from '@nestjs/swagger';
import { StoreType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class UpdateStoreDto {
    @ApiPropertyOptional({ example: 'Phở Hà Nội Chuẩn Vị' })
    @IsOptional()
    @IsString()
    @Length(2, 100)
    name?: string;

    @ApiPropertyOptional({ enum: StoreType })
    @IsOptional()
    @IsEnum(StoreType)
    type?: StoreType;

    @ApiPropertyOptional({ example: '456 Nguyễn Huệ, Quận 1, TP.HCM' })
    @IsOptional()
    @IsString()
    @Length(5, 255)
    address?: string;

    @ApiPropertyOptional({ example: 'Phở bò tái, nạm, gân - nấu từ xương hầm 12 tiếng' })
    @IsOptional()
    @IsString()
    @Length(0, 500)
    description?: string;
}
