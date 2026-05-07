import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
    @IsNotEmpty({ message: 'Full name is required' })
    @IsString({ message: 'Full name must be a string' })
    @Length(2, 50, { message: 'Full name must be between 2 and 50 characters long' })
    @Matches(/^[\p{L}\s]+$/u, {
        message: 'Full name can only contain letters and spaces',
    })
    @ApiProperty({
        description: 'Full name of the user',
        example: 'Nguyen Van A',
    })
    full_name: string;

    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @ApiProperty({
        description: 'Email address',
        example: 'engineer@gmail.com',
    })
    email: string;

    @IsNotEmpty({ message: 'Password is required' })
    @IsString({ message: 'Password must be a string' })
    @Length(8, 50, { message: 'Password must be between 8 and 50 characters long' })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
        {
            message:
                'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
        },
    )
    @ApiProperty({
        description: 'Account password',
        example: 'Password123!',
    })
    password: string;

    @IsNotEmpty({ message: 'Confirm password is required' })
    @IsString()
    @ApiProperty({
        description: 'Confirm password',
        example: 'Password123!',
    })
    confirmPassword: string;

    @IsOptional()
    @IsString({ message: 'Phone number must be a string' })
    @Matches(/^(?:\+84|0)(3|5|7|8|9)\d{8}$/, {
        message: 'Phone number must be a valid Vietnamese phone number',
    })
    @ApiProperty({
        description: 'Phone number',
        example: '0987654321',
        required: false,
    })
    phone?: string;

}