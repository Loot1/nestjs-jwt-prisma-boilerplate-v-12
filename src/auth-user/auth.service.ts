import { Injectable } from '@nestjs/common';

import {
	BaseAuthService,
	HashingService,
	TokenService,
} from '../auth/services';
import { AuthUser } from '../auth/types';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Local auth flow backed by the Prisma `user` model. The flow itself lives in
 * `BaseAuthService`; only the persistence hooks are defined here.
 */
@Injectable()
export class AuthService extends BaseAuthService {
	constructor(
		private prisma: PrismaService,
		tokenService: TokenService,
		hashingService: HashingService,
	) {
		super(tokenService, hashingService);
	}

	protected createUser(email: string, hash: string): Promise<AuthUser> {
		return this.prisma.user.create({
			data: {
				email,
				hash,
			},
		});
	}

	protected findUserByEmail(email: string): Promise<AuthUser | null> {
		return this.prisma.user.findUnique({
			where: {
				email,
			},
		});
	}

	protected findUserById(userId: number): Promise<AuthUser | null> {
		return this.prisma.user.findUnique({
			where: {
				id: userId,
			},
		});
	}

	protected async saveRefreshTokenHash(
		userId: number,
		hashedRt: string,
	): Promise<void> {
		await this.prisma.user.update({
			where: {
				id: userId,
			},
			data: {
				hashedRt,
			},
		});
	}

	protected async clearRefreshTokenHash(userId: number): Promise<void> {
		await this.prisma.user.updateMany({
			where: {
				id: userId,
				hashedRt: {
					not: null,
				},
			},
			data: {
				hashedRt: null,
			},
		});
	}
}
