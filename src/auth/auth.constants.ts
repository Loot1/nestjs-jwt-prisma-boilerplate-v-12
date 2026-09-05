import { TokenOptions } from '../common/index.js';

/**
 * Everything that identifies this authentication domain. A second domain
 * (admins, partners...) is a copy of this folder with other names, other
 * secrets and another Prisma model.
 */
export const AT_STRATEGY = 'jwt';
export const RT_STRATEGY = 'jwt-refresh';

export const AT_SECRET_ENV = 'AT_SECRET';
export const RT_SECRET_ENV = 'RT_SECRET';

export const TOKEN_OPTIONS: TokenOptions = {
	accessTokenSecretEnv: AT_SECRET_ENV,
	refreshTokenSecretEnv: RT_SECRET_ENV,
	accessTokenExpiresIn: '15m',
	refreshTokenExpiresIn: '7d',
};
