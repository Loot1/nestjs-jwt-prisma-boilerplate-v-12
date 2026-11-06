import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Post,
	Req,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { NodeRequest } from '@nestjs/platform-node';

import {
	GetCurrentUser,
	GetCurrentUserId,
	Public,
	Tokens,
} from '../common/index.js';
import { AuthService } from './auth.service.js';
import { authSchema, type AuthDto } from './dto/index.js';
import { RefreshTokenGuard } from './guards/index.js';
import { SessionMetadata, SessionService } from './session.service.js';

const deviceOf = (req: NodeRequest): SessionMetadata => ({
	userAgent: req.headers['user-agent'],
	ip: req.ip,
});

@Controller('auth')
@ApiTags('auth')
export class AuthController {
	constructor(
		private authService: AuthService,
		private sessions: SessionService,
	) {}

	@Public()
	@Post('local/signup')
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({ summary: 'Sign up' })
	signupLocal(
		@Body({ schema: authSchema }) dto: AuthDto,
		@Req() req: NodeRequest,
	): Promise<Tokens> {
		return this.authService.signupLocal(dto, deviceOf(req));
	}

	@Public()
	@Post('local/signin')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Sign in' })
	signinLocal(
		@Body({ schema: authSchema }) dto: AuthDto,
		@Req() req: NodeRequest,
	): Promise<Tokens> {
		return this.authService.signinLocal(dto, deviceOf(req));
	}

	@Post('logout')
	@HttpCode(HttpStatus.OK)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Logout this device' })
	logout(@GetCurrentUser('sid') sessionId: string): Promise<boolean> {
		return this.authService.logout(sessionId);
	}

	@Post('logout/all')
	@HttpCode(HttpStatus.OK)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Logout every device of the user' })
	logoutEverywhere(@GetCurrentUserId() userId: number): Promise<boolean> {
		return this.authService.logoutEverywhere(userId);
	}

	@Get('sessions')
	@HttpCode(HttpStatus.OK)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'List the devices currently signed in' })
	listSessions(@GetCurrentUserId() userId: number) {
		return this.sessions.listFor(userId);
	}

	@Public()
	@UseGuards(RefreshTokenGuard)
	@Post('refresh')
	@HttpCode(HttpStatus.OK)
	@ApiBearerAuth()
	@ApiOperation({ summary: 'Refresh token' })
	refreshTokens(
		@GetCurrentUser('refreshToken') refreshToken: string,
	): Promise<Tokens> {
		return this.authService.refresh(refreshToken);
	}
}
