import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from './auth/auth.module.js';
import { AccessTokenGuard } from './auth/guards/index.js';
import { validate } from './config/index.js';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			cache: true,
			// The environment is already loaded by the start script
			// (`--env-file .env/.env.<env>`), and `.env` is a folder here.
			ignoreEnvFile: true,
			// A missing or weak secret stops the boot instead of the first
			// request that happens to need it. Everything downstream then
			// reads its values through `ConfigService`.
			validate,
		}),
		AuthModule,
	],
	providers: [
		{
			provide: APP_GUARD,
			useClass: AccessTokenGuard,
		},
	],
})
export class AppModule {}
