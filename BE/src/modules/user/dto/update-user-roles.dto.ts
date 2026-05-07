import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class UpdateUserRolesDto {
    @ApiProperty({
        type: [String],
        example: ['CUSTOMER', 'DRIVER'],
        description: 'List of role names to assign to the user (replaces existing roles)',
    })
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    roles: string[];
}
