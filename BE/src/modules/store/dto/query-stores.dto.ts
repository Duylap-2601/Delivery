import { ApiPropertyOptional } from '@nestjs/swagger';
import { StoreType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryStoresDto {
    @ApiPropertyOptional({ example: 1, default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ example: 10, default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @ApiPropertyOptional({ example: 'bún bò', description: 'Search by store name or address' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ enum: StoreType, description: 'Filter by store type' })
    @IsOptional()
    @IsEnum(StoreType)
    type?: StoreType;
}
