import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { JwtPayload, RefreshTokenPayload, Tokens } from '../types/index.js';

export type TokenOptions = {
	accessTokenSecret: string;
	refreshTokenSecret: string;
	accessTokenTtl: number;
	refreshTokenTtl: number;
};

@Injectable()
export class TokenService {
	constructor(private readonly jwtService: JwtService) {}

	signAccessToken(
		payload: JwtPayload,
		options: TokenOptions,
	): Promise<string> {
		return this.jwtService.signAsync(payload, {
			secret: options.accessTokenSecret,
			expiresIn: options.accessTokenTtl,
		});
	}

	async getTokens(
		payload: JwtPayload,
		tokenId: string,
		options: TokenOptions,
	): Promise<Tokens> {
		const [at, rt] = await Promise.all([
			this.signAccessToken(payload, options),
			this.jwtService.signAsync(
				{ ...payload, jti: tokenId } satisfies RefreshTokenPayload,
				{
					secret: options.refreshTokenSecret,
					expiresIn: options.refreshTokenTtl,
				},
			),
		]);

		return {
			access_token: at,
			refresh_token: rt,
		};
	}

	async verifyRefreshToken(
		token: string,
		options: TokenOptions,
	): Promise<RefreshTokenPayload> {
		const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
			token,
			{ secret: options.refreshTokenSecret },
		);

		if (!payload?.sid || !payload?.jti) {
			throw new Error('Refresh token is missing its session claims');
		}

		return payload;
	}
}
