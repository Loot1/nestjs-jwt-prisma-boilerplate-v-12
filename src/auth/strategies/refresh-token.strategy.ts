import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JwtPayload, JwtPayloadWithRt } from '../../common/index.js';
import { RT_SECRET_ENV, RT_STRATEGY } from '../auth.constants.js';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
	Strategy,
	RT_STRATEGY,
) {
	constructor(config: ConfigService) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			secretOrKey: config.getOrThrow<string>(RT_SECRET_ENV),
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
