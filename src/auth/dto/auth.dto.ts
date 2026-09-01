import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { AuthCredentials } from '../types';

export class AuthDto implements AuthCredentials {
	@ApiProperty({ default: 'test@test.com' })
	@IsNotEmpty()
	@IsString()
	email: string;

	@ApiProperty({ default: 'test1234' })
	@IsNotEmpty()
	@IsString()
	password: string;
}
