import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Length,
    Max,
    Min,
} from 'class-validator';

export class CreateAddressDto {
    @ApiProperty({ example: 'Nhà', description: 'Label for the address (Home, Office, ...)' })
    @IsString()
    @IsNotEmpty()
    @Length(1, 50)
    label: string;

    @ApiProperty({ example: '123 Nguyễn Huệ, Quận 1, TP.HCM' })
    @IsString()
    @IsNotEmpty()
    @Length(5, 255)
    fullAddress: string;

    @ApiPropertyOptional({ example: 10.7769, description: 'Latitude (for map integration)' })
    @IsOptional()
    @IsNumber()
    @Min(-90)
    @Max(90)
    lat?: number;

    @ApiPropertyOptional({ example: 106.7009, description: 'Longitude (for map integration)' })
    @IsOptional()
    @IsNumber()
    @Min(-180)
    @Max(180)
    lng?: number;

    @ApiPropertyOptional({ example: true, description: 'Set as default delivery address' })
    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;
}
