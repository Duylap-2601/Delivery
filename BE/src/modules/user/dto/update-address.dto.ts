import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsNumber,
    IsOptional,
    IsString,
    Length,
    Max,
    Min,
} from 'class-validator';

export class UpdateAddressDto {
    @ApiPropertyOptional({ example: 'Văn phòng' })
    @IsOptional()
    @IsString()
    @Length(1, 50)
    label?: string;

    @ApiPropertyOptional({ example: '456 Lê Lợi, Quận 1, TP.HCM' })
    @IsOptional()
    @IsString()
    @Length(5, 255)
    fullAddress?: string;

    @ApiPropertyOptional({ example: 10.7769 })
    @IsOptional()
    @IsNumber()
    @Min(-90)
    @Max(90)
    lat?: number;

    @ApiPropertyOptional({ example: 106.7009 })
    @IsOptional()
    @IsNumber()
    @Min(-180)
    @Max(180)
    lng?: number;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;
}
