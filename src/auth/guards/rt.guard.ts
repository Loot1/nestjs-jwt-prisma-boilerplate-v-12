import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { RT_STRATEGY } from '../auth.constants.js';

/** Refresh token guard, applied to the `auth/refresh` route only. */
@Injectable()
export class RefreshTokenGuard extends AuthGuard(RT_STRATEGY) {
	// Explicit no-arg constructor: without it Nest inherits the paramtypes of
	// the passport mixin and tries to inject `AuthModuleOptions`.
	constructor() {
		super();
	}
}
