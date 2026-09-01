import { CanActivate, Injectable, Type } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Plain passport guard bound to a strategy name, with no `@Public()` bypass.
 * Use it to protect the routes of a secondary auth domain, whose tokens the
 * globally registered guard would reject.
 */
export function createStrategyGuard(strategyName: string): Type<CanActivate> {
	@Injectable()
	class StrategyGuard extends AuthGuard(strategyName) {
		// Explicit no-arg constructor: without it Nest inherits the paramtypes of
		// the passport mixin and tries to inject `AuthModuleOptions`.
		constructor() {
			super();
		}
	}

	return StrategyGuard;
}
