import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import {
	AccessTokenStrategy,
	RefreshTokenStrategy,
} from './strategies/index.js';

@Module({
	controllers: [AuthController],
	providers: [AuthService, AccessTokenStrategy, RefreshTokenStrategy],
	exports: [AuthService],
})
export class AuthModule {}
