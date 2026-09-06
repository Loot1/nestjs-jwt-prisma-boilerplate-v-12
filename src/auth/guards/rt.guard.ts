import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { RT_STRATEGY } from '../auth.constants.js';

@Injectable()
export class RefreshTokenGuard extends AuthGuard(RT_STRATEGY) {
	constructor() {
		super();
	}
}
