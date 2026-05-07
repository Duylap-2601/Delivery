import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
} from 'class-validator';

export class QueryProductsDto {
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

    @ApiPropertyOptional({ example: 'bún bò', description: 'Search by name or description' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Filter by store ID' })
    @IsOptional()
    @IsUUID()
    storeId?: string;

    @ApiPropertyOptional({ description: 'Filter by category ID' })
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @ApiPropertyOptional({ description: 'Min price filter' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    minPrice?: number;

    @ApiPropertyOptional({ description: 'Max price filter' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    maxPrice?: number;

    @ApiPropertyOptional({ description: 'Only show active products (default: true for public)' })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isActive?: boolean;
}
