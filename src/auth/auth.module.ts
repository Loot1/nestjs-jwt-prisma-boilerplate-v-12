import { Module } from '@nestjs/common';

import { CommonModule } from '../common/index.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionService } from './session.service.js';
import {
	AccessTokenStrategy,
	RefreshTokenStrategy,
} from './strategies/index.js';

@Module({
	imports: [CommonModule, PrismaModule],
	controllers: [AuthController],
	providers: [
		AuthService,
		SessionService,
		AccessTokenStrategy,
		RefreshTokenStrategy,
	],
	exports: [AuthService, SessionService],
})
export class AuthModule {}
