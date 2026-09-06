import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JwtPayloadWithRt, RefreshTokenPayload } from '../../common/index.js';
import { RT_STRATEGY } from '../auth.constants.js';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, RT_STRATEGY) {
	constructor(config: ConfigService) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			secretOrKey: config.getOrThrow<string>('RT_SECRET'),
			passReqToCallback: true,
		});
	}

	validate(req: Request, payload: RefreshTokenPayload): JwtPayloadWithRt {
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
