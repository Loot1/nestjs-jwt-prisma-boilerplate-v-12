import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Post,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
	GetCurrentUser,
	GetCurrentUserId,
	Public,
	Tokens,
} from '../common/index.js';
import { AuthService } from './auth.service.js';
import { AuthDto } from './dto/index.js';
import { RefreshTokenGuard } from './guards/index.js';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
	constructor(private authService: AuthService) {}

	@Public()
	@Post('local/signup')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Sign up' })
	signupLocal(@Body() dto: AuthDto): Promise<Tokens> {
		return this.authService.signupLocal(dto);
	}

	@Public()
	@Post('local/signin')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Sign in' })
	signinLocal(@Body() dto: AuthDto): Promise<Tokens> {
		return this.authService.signinLocal(dto);
	}

	@Post('logout')
	@HttpCode(HttpStatus.OK)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Logout' })
	logout(@GetCurrentUserId() userId: number): Promise<boolean> {
		return this.authService.logout(userId);
	}

	@Public()
	@UseGuards(RefreshTokenGuard)
	@Post('refresh')
	@HttpCode(HttpStatus.OK)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Refresh token' })
	refreshTokens(
		@GetCurrentUserId() userId: number,
		@GetCurrentUser('refreshToken') refreshToken: string,
	): Promise<Tokens> {
		return this.authService.refreshTokens(userId, refreshToken);
	}
}
