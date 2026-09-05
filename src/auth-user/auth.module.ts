import { createAuthDomain } from '../common/modules/index.js';
import { AuthService } from './auth.service.js';

/**
 * Default (user) authentication domain: strategies, guards, services and the
 * `auth` routes. A second domain is one more `createAuthDomain()` call.
 */
export const userAuthDomain = createAuthDomain({
	authService: AuthService,
	path: 'auth',
	tag: 'auth',
});

export const AuthModule = userAuthDomain.module;
