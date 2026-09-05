import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

import { HashingService, Tokens, TokenService } from '../common/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TOKEN_OPTIONS } from './auth.constants.js';
import { AuthDto } from './dto/index.js';

/** True when the error is a Prisma unique constraint violation (P2002). */
const isDuplicateUser = (error: unknown): boolean =>
	error instanceof PrismaClientKnownRequestError && error.code === 'P2002';

/** Local (email + password) authentication flow backed by the `user` model. */
@Injectable()
export class AuthService {
	constructor(
		private prisma: PrismaService,
		private tokenService: TokenService,
		private hashingService: HashingService,
	) {}

	async signupLocal(dto: AuthDto): Promise<Tokens> {
		const hash = await this.hashingService.hash(dto.password);

		const user = await this.prisma.user
			.create({
				data: {
					email: dto.email,
					hash,
				},
			})
			.catch((error) => {
				if (isDuplicateUser(error))
					throw new ForbiddenException('Credentials incorrect');
				throw error;
			});

		return this.issueTokens(user.id, user.email);
	}

	async signinLocal(dto: AuthDto): Promise<Tokens> {
		const user = await this.prisma.user.findUnique({
			where: {
				email: dto.email,
			},
		});
		if (!user) throw new ForbiddenException('Access Denied');

		const passwordMatches = await this.hashingService.verify(
			user.hash,
			dto.password,
		);
		if (!passwordMatches) throw new ForbiddenException('Access Denied');

		return this.issueTokens(user.id, user.email);
	}

	async logout(userId: number): Promise<boolean> {
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

		return true;
	}

	async refreshTokens(userId: number, rt: string): Promise<Tokens> {
		const user = await this.prisma.user.findUnique({
			where: {
				id: userId,
			},
		});
		if (!user || !user.hashedRt)
			throw new ForbiddenException('Access Denied');

		const rtMatches = await this.hashingService.verify(user.hashedRt, rt);
		if (!rtMatches) throw new ForbiddenException('Access Denied');

		return this.issueTokens(user.id, user.email);
	}

	/** Signs a fresh pair and rotates the stored refresh token hash. */
	private async issueTokens(userId: number, email: string): Promise<Tokens> {
		const tokens = await this.tokenService.getTokens(
			{ sub: userId, email },
			TOKEN_OPTIONS,
		);

		const hashedRt = await this.hashingService.hash(tokens.refresh_token);
		await this.prisma.user.update({
			where: {
				id: userId,
			},
			data: {
				hashedRt,
			},
		});

		return tokens;
	}
}
