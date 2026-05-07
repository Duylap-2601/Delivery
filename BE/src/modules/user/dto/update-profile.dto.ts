import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    Length,
    Matches,
} from 'class-validator';

export class UpdateProfileDto {
    @ApiPropertyOptional({ example: 'Nguyen Van A', description: 'Full name of the user' })
    @IsOptional()
    @IsString()
    @Length(2, 100)
    fullName?: string;

    @ApiPropertyOptional({ example: '0912345678', description: 'Vietnamese phone number' })
    @IsOptional()
    @IsString()
    @Matches(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, {
        message: 'phone must be a valid Vietnamese phone number',
    })
    phone?: string;
}
