import { ForbiddenException } from '@nestjs/common';

import { AuthCredentials, AuthUser, Tokens } from '../types/index.js';
import { isUniqueConstraintViolation } from '../utils/index.js';
import { HashingService } from './hashing.service.js';
import { TokenService } from './token.service.js';

/**
 * Local (email + password) authentication flow, storage agnostic.
 *
 * A concrete service only has to say *where* the users live by implementing the
 * four persistence hooks below; sign-up, sign-in, logout and refresh are
 * inherited as is. Declaring a second auth domain therefore costs one small
 * subclass instead of a copy of the whole flow.
 */
export abstract class BaseAuthService {
	protected constructor(
		protected readonly tokenService: TokenService,
		protected readonly hashingService: HashingService,
	) {}

	/** Persists a new user. May throw the storage duplicate error as is. */
	protected abstract createUser(
		email: string,
		hash: string,
	): Promise<AuthUser>;

	protected abstract findUserByEmail(email: string): Promise<AuthUser | null>;

	protected abstract findUserById(userId: number): Promise<AuthUser | null>;

	/** Stores the hashed refresh token of an existing user. */
	protected abstract saveRefreshTokenHash(
		userId: number,
		hashedRt: string,
	): Promise<void>;

	/** Clears the refresh token hash. Must not throw when the user is unknown. */
	protected abstract clearRefreshTokenHash(userId: number): Promise<void>;

	/** Override when the storage does not report duplicates the Prisma way. */
	protected isDuplicateUserError(error: unknown): boolean {
		return isUniqueConstraintViolation(error);
	}

	async signupLocal(dto: AuthCredentials): Promise<Tokens> {
		const hash = await this.hashingService.hash(dto.password);

		const user = await this.createUser(dto.email, hash).catch((error) => {
			if (this.isDuplicateUserError(error)) {
				throw new ForbiddenException('Credentials incorrect');
			}
			throw error;
		});

		return this.issueTokens(user);
	}

	async signinLocal(dto: AuthCredentials): Promise<Tokens> {
		const user = await this.findUserByEmail(dto.email);
		if (!user) throw new ForbiddenException('Access Denied');

		const passwordMatches = await this.hashingService.verify(
			user.hash,
			dto.password,
		);
		if (!passwordMatches) throw new ForbiddenException('Access Denied');

		return this.issueTokens(user);
	}

	async logout(userId: number): Promise<boolean> {
		await this.clearRefreshTokenHash(userId);
		return true;
	}

	async refreshTokens(userId: number, rt: string): Promise<Tokens> {
		const user = await this.findUserById(userId);
		if (!user || !user.hashedRt)
			throw new ForbiddenException('Access Denied');

		const rtMatches = await this.hashingService.verify(user.hashedRt, rt);
		if (!rtMatches) throw new ForbiddenException('Access Denied');

		return this.issueTokens(user);
	}

	async updateRtHash(userId: number, rt: string): Promise<void> {
		const hash = await this.hashingService.hash(rt);
		await this.saveRefreshTokenHash(userId, hash);
	}

	getTokens(userId: number, email: string): Promise<Tokens> {
		return this.tokenService.getTokens({ sub: userId, email });
	}

	/** Signs a fresh pair and rotates the stored refresh token hash. */
	protected async issueTokens(user: AuthUser): Promise<Tokens> {
		const tokens = await this.getTokens(user.id, user.email);
		await this.updateRtHash(user.id, tokens.refresh_token);

		return tokens;
	}
}
