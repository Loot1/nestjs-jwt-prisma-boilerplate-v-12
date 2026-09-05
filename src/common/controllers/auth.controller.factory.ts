import {
	Body,
	CanActivate,
	Controller,
	HttpCode,
	HttpStatus,
	Inject,
	Post,
	Type,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { GetCurrentUser, GetCurrentUserId, Public } from '../decorators/index.js';
import { AuthDto } from '../../auth/dto/index.js';
import { BaseAuthService } from '../../auth/services/index.js';
import { Tokens } from '../../auth/types/index.js';

export type AuthControllerOptions = {
	/** Route prefix, e.g. `auth` or `admin/auth`. */
	path: string;
	/** Swagger tag, defaults to the path. */
	tag?: string;
	/** Service handling the flow; injected by class token. */
	authService: Type<BaseAuthService>;
	/** Refresh guard of the same domain, see `createRefreshTokenGuard`. */
	refreshGuard: Type<CanActivate>;
	/**
	 * Access guard of the same domain, see `createStrategyGuard`. The domain
	 * protects its own routes rather than relying on the guard registered
	 * globally, which belongs to another domain and would reject these tokens.
	 */
	accessGuard: Type<CanActivate>;
};

/**
 * Builds the four local-auth routes (signup, signin, logout, refresh) for one
 * authentication domain. Write your own controller instead if the domain needs
 * a different payload than `AuthDto`.
 */
export function createAuthController(
	options: AuthControllerOptions,
): Type<unknown> {
	@Controller(options.path)
	@ApiTags(options.tag ?? options.path)
	class GenericAuthController {
		constructor(
			@Inject(options.authService)
			protected readonly authService: BaseAuthService,
		) {}

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

		// `@Public()` only disarms the globally registered guard, the domain's own
		// `accessGuard` takes over.
		@Public()
		@UseGuards(options.accessGuard)
		@Post('logout')
		@ApiBearerAuth()
		@HttpCode(HttpStatus.OK)
		@ApiOperation({ summary: 'Logout' })
		logout(@GetCurrentUserId() userId: number): Promise<boolean> {
			return this.authService.logout(userId);
		}

		@Public()
		@UseGuards(options.refreshGuard)
		@Post('refresh')
		@HttpCode(HttpStatus.OK)
		@ApiOperation({ summary: 'Refresh token' })
		@ApiBearerAuth()
		refreshTokens(
			@GetCurrentUserId() userId: number,
			@GetCurrentUser('refreshToken') refreshToken: string,
		): Promise<Tokens> {
			return this.authService.refreshTokens(userId, refreshToken);
		}
	}

	return GenericAuthController;
}
