import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateUserStatusDto {
    @ApiProperty({
        enum: UserStatus,
        example: UserStatus.BANNED,
        description: 'New status for the user',
    })
    @IsEnum(UserStatus)
    status: UserStatus;
}
