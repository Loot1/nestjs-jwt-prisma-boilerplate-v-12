import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JwtPayload } from '../../common/index.js';
import { AT_STRATEGY } from '../auth.constants.js';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, AT_STRATEGY) {
	constructor(config: ConfigService) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			secretOrKey: config.getOrThrow<string>('AT_SECRET'),
		});
	}

	validate(payload: JwtPayload): JwtPayload {
		return payload;
	}
}
