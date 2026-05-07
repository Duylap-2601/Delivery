import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateCategoryDto {
    @ApiProperty({ example: 'Đồ ăn nhanh', description: 'Unique category name' })
    @IsString()
    @IsNotEmpty()
    @Length(2, 100)
    name: string;
}
