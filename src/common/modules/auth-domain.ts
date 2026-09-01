import { CanActivate, Module, Provider, Type } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import {
	createJwtAuthOptions,
	JWT_AUTH_OPTIONS,
	JwtAuthOptions,
} from '../../auth/config';
import { createAuthController } from '../controllers';
import {
	createAccessTokenGuard,
	createRefreshTokenGuard,
	createStrategyGuard,
} from '../guards';
import {
	BaseAuthService,
	HashingService,
	TokenService,
} from '../../auth/services';
import {
	createAccessTokenStrategy,
	createRefreshTokenStrategy,
} from '../../auth/strategies';

export type AuthDomainConfig = {
	/** Service handling the flow, usually a `BaseAuthService` subclass. */
	authService: Type<BaseAuthService>;
	/** Route prefix of the generated controller. Omit to write your own. */
	path?: string;
	/** Swagger tag, defaults to the path. */
	tag?: string;
	/** Overrides of the default strategy names, secrets and lifetimes. */
	jwt?: Partial<JwtAuthOptions>;
	/** Modules the auth service needs (the Prisma module is already global). */
	imports?: Parameters<typeof Module>[0]['imports'];
	/** Extra providers of the domain. */
	providers?: Provider[];
};

export type AuthDomain = {
	/** Module to import, wired with its strategies, services and controller. */
	module: Type<unknown>;
	/** Resolved options, handy to reuse the strategy names elsewhere. */
	options: JwtAuthOptions;
	/** Access guard honouring `@Public()`, meant for `APP_GUARD`. */
	accessGuard: Type<CanActivate>;
	/** Access guard without `@Public()` bypass, to protect your own routes. */
	strictAccessGuard: Type<CanActivate>;
	/** Refresh guard, already applied to the generated `refresh` route. */
	refreshGuard: Type<CanActivate>;
};

/**
 * Assembles a complete authentication domain: JWT options, both passport
 * strategies, both guards, the token/hashing services and, unless `path` is
 * omitted, the four local-auth routes.
 *
 * Strategies and guards are built once here, so declaring a second domain is a
 * single call instead of a hand-assembled module.
 *
 * @example
 * export const adminAuthDomain = createAuthDomain({
 *   authService: AdminAuthService,
 *   path: 'admin/auth',
 *   jwt: {
 *     accessTokenStrategyName: 'admin-jwt',
 *     refreshTokenStrategyName: 'admin-jwt-refresh',
 *     accessTokenSecretEnv: 'ADMIN_AT_SECRET',
 *     refreshTokenSecretEnv: 'ADMIN_RT_SECRET',
 *   },
 * });
 */
export function createAuthDomain(config: AuthDomainConfig): AuthDomain {
	const options = createJwtAuthOptions(config.jwt);

	const accessGuard = createAccessTokenGuard(options.accessTokenStrategyName);
	const strictAccessGuard = createStrategyGuard(
		options.accessTokenStrategyName,
	);
	const refreshGuard = createRefreshTokenGuard(
		options.refreshTokenStrategyName,
	);

	@Module({
		imports: [JwtModule.register({}), ...(config.imports ?? [])],
		controllers: config.path
			? [
					createAuthController({
						path: config.path,
						tag: config.tag,
						authService: config.authService,
						accessGuard: strictAccessGuard,
						refreshGuard,
					}),
				]
			: [],
		providers: [
			{ provide: JWT_AUTH_OPTIONS, useValue: options },
			TokenService,
			HashingService,
			config.authService,
			createAccessTokenStrategy(options),
			createRefreshTokenStrategy(options),
			...(config.providers ?? []),
		],
		exports: [config.authService, TokenService, HashingService],
	})
	class AuthDomainModule {}

	return {
		module: AuthDomainModule,
		options,
		accessGuard,
		strictAccessGuard,
		refreshGuard,
	};
}
