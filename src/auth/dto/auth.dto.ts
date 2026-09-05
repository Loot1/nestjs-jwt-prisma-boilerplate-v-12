import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AuthDto {
	@ApiProperty({ default: 'test@test.com' })
	@IsNotEmpty()
	@IsString()
	email: string;

	@ApiProperty({ default: 'test1234' })
	@IsNotEmpty()
	@IsString()
	password: string;
}
