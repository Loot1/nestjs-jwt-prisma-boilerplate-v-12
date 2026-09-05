import { ForbiddenException, Inject, Injectable, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JwtAuthOptions } from '../config/index.js';
import { JwtPayload, JwtPayloadWithRt } from '../types/index.js';

/** Builds the refresh token strategy of an authentication domain. */
export function createRefreshTokenStrategy(
	options: JwtAuthOptions,
): Type<unknown> {
	@Injectable()
	class RefreshTokenStrategy extends PassportStrategy(
		Strategy,
		options.refreshTokenStrategyName,
	) {
		constructor(@Inject(ConfigService) config: ConfigService) {
			super({
				jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
				secretOrKey: config.getOrThrow<string>(
					options.refreshTokenSecretEnv,
				),
				passReqToCallback: true,
			});
		}

		validate(req: Request, payload: JwtPayload): JwtPayloadWithRt {
			const refreshToken = req
				?.get('authorization')
				?.replace('Bearer', '')
				.trim();

			if (!refreshToken)
				throw new ForbiddenException('Refresh token malformed');

			return {
				...payload,
				refreshToken,
			};
		}
	}

	return RefreshTokenStrategy;
}
