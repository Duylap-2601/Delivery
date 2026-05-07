import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';

export class QueryUsersDto {
    @ApiPropertyOptional({ example: 1, description: 'Page number (1-indexed)', default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ example: 10, description: 'Items per page', default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @ApiPropertyOptional({ example: 'nguyen', description: 'Search by name or email' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ enum: UserStatus, description: 'Filter by user status' })
    @IsOptional()
    @IsEnum(UserStatus)
    status?: UserStatus;
}
