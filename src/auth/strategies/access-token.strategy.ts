import { Inject, Injectable, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JwtAuthOptions } from '../config/index.js';
import { JwtPayload } from '../types/index.js';

/**
 * Builds the access token strategy of an authentication domain. The passport
 * name and the secret both come from the options, so two domains never collide.
 */
export function createAccessTokenStrategy(
	options: JwtAuthOptions,
): Type<unknown> {
	@Injectable()
	class AccessTokenStrategy extends PassportStrategy(
		Strategy,
		options.accessTokenStrategyName,
	) {
		constructor(@Inject(ConfigService) config: ConfigService) {
			super({
				jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
				secretOrKey: config.getOrThrow<string>(
					options.accessTokenSecretEnv,
				),
			});
		}

		validate(payload: JwtPayload): JwtPayload {
			return payload;
		}
	}

	return AccessTokenStrategy;
}
