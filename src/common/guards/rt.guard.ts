import { CanActivate, Type } from '@nestjs/common';

import { createStrategyGuard } from './strategy.guard';

/** Builds the refresh token guard of an authentication domain. */
export const createRefreshTokenGuard = (
	strategyName: string,
): Type<CanActivate> => createStrategyGuard(strategyName);
