import type { JwtSignOptions } from '@nestjs/jwt';

/**
 * Everything that distinguishes one authentication domain from another
 * (users, admins, partners...). Two auth modules can live side by side as long
 * as they declare different passport strategy names and different secrets.
 */
export type JwtAuthOptions = {
	/** Passport strategy name used by the access token strategy/guard. */
	accessTokenStrategyName: string;
	/** Passport strategy name used by the refresh token strategy/guard. */
	refreshTokenStrategyName: string;
	/** Name of the env variable holding the access token secret. */
	accessTokenSecretEnv: string;
	/** Name of the env variable holding the refresh token secret. */
	refreshTokenSecretEnv: string;
	accessTokenExpiresIn: JwtSignOptions['expiresIn'];
	refreshTokenExpiresIn: JwtSignOptions['expiresIn'];
};

/** Injection token used to provide `JwtAuthOptions` inside an auth module. */
export const JWT_AUTH_OPTIONS = 'JWT_AUTH_OPTIONS';

export const DEFAULT_JWT_AUTH_OPTIONS: JwtAuthOptions = {
	accessTokenStrategyName: 'jwt',
	refreshTokenStrategyName: 'jwt-refresh',
	accessTokenSecretEnv: 'AT_SECRET',
	refreshTokenSecretEnv: 'RT_SECRET',
	accessTokenExpiresIn: '15m',
	refreshTokenExpiresIn: '7d',
};

/**
 * Builds a set of options from the defaults.
 *
 * @example
 * export const adminJwtOptions = createJwtAuthOptions({
 *   accessTokenStrategyName: 'admin-jwt',
 *   refreshTokenStrategyName: 'admin-jwt-refresh',
 *   accessTokenSecretEnv: 'ADMIN_AT_SECRET',
 *   refreshTokenSecretEnv: 'ADMIN_RT_SECRET',
 * });
 */
export const createJwtAuthOptions = (
	overrides: Partial<JwtAuthOptions> = {},
): JwtAuthOptions => ({ ...DEFAULT_JWT_AUTH_OPTIONS, ...overrides });
