import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @ApiProperty({
        description: 'Email of the account',
        example: 'user@gmail.com',
    })
    identifier: string;

    @IsNotEmpty({ message: 'Password is required' })
    @IsString()
    @ApiProperty({
        description: 'Password of the account',
        example: 'Password123!',
    })
    password: string;
}
