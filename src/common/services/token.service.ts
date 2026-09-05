import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';

import { JwtPayload, Tokens } from '../types/index.js';

/**
 * Signing options of one authentication domain. The secrets are read from the
 * environment at signing time, so a second domain only has to declare its own
 * variable names (see `src/auth/auth.constants.ts`).
 */
export type TokenOptions = {
	accessTokenSecretEnv: string;
	refreshTokenSecretEnv: string;
	accessTokenExpiresIn: JwtSignOptions['expiresIn'];
	refreshTokenExpiresIn: JwtSignOptions['expiresIn'];
};

/** Signs the access/refresh token pair of an authentication domain. */
@Injectable()
export class TokenService {
	constructor(
		private readonly jwtService: JwtService,
		private readonly config: ConfigService,
	) {}

	async getTokens(
		payload: JwtPayload,
		options: TokenOptions,
	): Promise<Tokens> {
		const [at, rt] = await Promise.all([
			this.jwtService.signAsync(payload, {
				secret: this.config.getOrThrow<string>(
					options.accessTokenSecretEnv,
				),
				expiresIn: options.accessTokenExpiresIn,
			}),
			this.jwtService.signAsync(payload, {
				secret: this.config.getOrThrow<string>(
					options.refreshTokenSecretEnv,
				),
				expiresIn: options.refreshTokenExpiresIn,
			}),
		]);

		return {
			access_token: at,
			refresh_token: rt,
		};
	}
}
