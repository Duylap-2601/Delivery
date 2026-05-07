import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class UpdateCategoryDto {
    @ApiProperty({ example: 'Đồ uống' })
    @IsString()
    @IsNotEmpty()
    @Length(2, 100)
    name: string;
}
