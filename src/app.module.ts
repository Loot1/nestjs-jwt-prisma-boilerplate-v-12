import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule, userAuthDomain } from './auth-user/auth.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		AuthModule,
		PrismaModule,
	],
	providers: [
		{
			provide: APP_GUARD,
			useClass: userAuthDomain.accessGuard,
		},
	],
})
export class AppModule {}
