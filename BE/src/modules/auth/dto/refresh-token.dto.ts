import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
    @IsNotEmpty({ message: 'Refresh token is required' })
    @IsString()
    @ApiProperty({
        description: 'The refresh token received from login',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    refreshToken: string;
}
