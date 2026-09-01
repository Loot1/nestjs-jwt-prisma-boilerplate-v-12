import { createAuthDomain } from '../common/modules';
import { AuthService } from './auth.service';

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
