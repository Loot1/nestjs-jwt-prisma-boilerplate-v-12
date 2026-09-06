import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { HashingService } from './services/hashing.service.js';
import { TokenService } from './services/token.service.js';

@Module({
	imports: [JwtModule.register({})],
	providers: [HashingService, TokenService],
	exports: [HashingService, TokenService],
})
export class CommonModule {}
