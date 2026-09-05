import {
	CanActivate,
	ExecutionContext,
	Inject,
	Injectable,
	Type,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * Builds an access token guard bound to a passport strategy name, letting
 * routes decorated with `@Public()` through. Meant to be registered globally
 * (`APP_GUARD`); to protect the routes of a domain use `createStrategyGuard`,
 * which has no `@Public()` bypass.
 */
export function createAccessTokenGuard(
	strategyName: string,
): Type<CanActivate> {
	@Injectable()
	class AccessTokenGuard extends AuthGuard(strategyName) {
		constructor(@Inject(Reflector) private reflector: Reflector) {
			super();
		}

		canActivate(context: ExecutionContext) {
			const isPublic = this.reflector.getAllAndOverride(IS_PUBLIC_KEY, [
				context.getHandler(),
				context.getClass(),
			]);

			if (isPublic) return true;

			return super.canActivate(context);
		}
	}

	return AccessTokenGuard;
}
