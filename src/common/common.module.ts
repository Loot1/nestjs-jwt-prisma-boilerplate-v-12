import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { HashingService } from './services/hashing.service.js';
import { TokenService } from './services/token.service.js';

/**
 * Domain agnostic services, available everywhere without being imported:
 * any auth module can inject them straight away.
 */
@Global()
@Module({
	imports: [JwtModule.register({})],
	providers: [HashingService, TokenService],
	exports: [HashingService, TokenService],
})
export class CommonModule {}
