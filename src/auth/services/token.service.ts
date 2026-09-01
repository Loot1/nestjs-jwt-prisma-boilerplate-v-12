import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { JWT_AUTH_OPTIONS } from '../config';
import type { JwtAuthOptions } from '../config';
import { JwtPayload, Tokens } from '../types';

/**
 * Signs the access/refresh token pair for one authentication domain.
 * Provide it in each auth module together with its own `JWT_AUTH_OPTIONS`.
 */
@Injectable()
export class TokenService {
	constructor(
		private readonly jwtService: JwtService,
		private readonly config: ConfigService,
		@Inject(JWT_AUTH_OPTIONS) private readonly options: JwtAuthOptions,
	) {}

	async getTokens(payload: JwtPayload): Promise<Tokens> {
		const [at, rt] = await Promise.all([
			this.jwtService.signAsync(payload, {
				secret: this.config.getOrThrow<string>(
					this.options.accessTokenSecretEnv,
				),
				expiresIn: this.options.accessTokenExpiresIn,
			}),
			this.jwtService.signAsync(payload, {
				secret: this.config.getOrThrow<string>(
					this.options.refreshTokenSecretEnv,
				),
				expiresIn: this.options.refreshTokenExpiresIn,
			}),
		]);

		return {
			access_token: at,
			refresh_token: rt,
		};
	}
}
