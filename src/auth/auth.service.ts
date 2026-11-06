import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

import {
	HashingService,
	JwtPayload,
	RefreshTokenPayload,
	TokenOptions,
	Tokens,
	TokenService,
} from '../common/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AT_TTL, RT_GRACE, RT_TTL } from './auth.constants.js';
import type { AuthDto } from './dto/index.js';
import {
	SessionMetadata,
	SessionService,
	SessionWithUser,
} from './session.service.js';

const isDuplicateUser = (error: unknown): boolean =>
	error instanceof PrismaClientKnownRequestError && error.code === 'P2002';

const isLive = (session: SessionWithUser | null): session is SessionWithUser =>
	session !== null && session.expiresAt > new Date();

const payloadOf = (session: SessionWithUser): JwtPayload => ({
	sub: session.user.id,
	email: session.user.email,
	sid: session.id,
});

@Injectable()
export class AuthService {
	private readonly tokens: TokenOptions;

	constructor(
		private prisma: PrismaService,
		private sessions: SessionService,
		private tokenService: TokenService,
		private hashingService: HashingService,
		config: ConfigService,
	) {
		this.tokens = {
			accessTokenSecret: config.getOrThrow<string>('AT_SECRET'),
			refreshTokenSecret: config.getOrThrow<string>('RT_SECRET'),
			accessTokenTtl: AT_TTL,
			refreshTokenTtl: RT_TTL,
		};
	}

	async signupLocal(
		dto: AuthDto,
		metadata?: SessionMetadata,
	): Promise<Tokens> {
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

		return this.openSession(user.id, user.email, metadata);
	}

	async signinLocal(
		dto: AuthDto,
		metadata?: SessionMetadata,
	): Promise<Tokens> {
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

		return this.openSession(user.id, user.email, metadata);
	}

	async logout(sessionId: string): Promise<boolean> {
		await this.sessions.revoke(sessionId);

		return true;
	}

	async logoutEverywhere(userId: number): Promise<boolean> {
		await this.sessions.revokeAll(userId);

		return true;
	}

	async refresh(refreshToken: string): Promise<Tokens> {
		let payload: RefreshTokenPayload;
		try {
			payload = await this.tokenService.verifyRefreshToken(
				refreshToken,
				this.tokens,
			);
		} catch {
			throw new ForbiddenException('Access Denied');
		}

		let session = await this.sessions.find(payload.sid);
		if (!isLive(session)) throw new ForbiddenException('Access Denied');

		if (payload.jti === session.tokenId) {
			const tokenId = await this.sessions.rotate(
				session.id,
				session.tokenId,
				this.tokens.refreshTokenTtl,
			);
			if (tokenId) return this.signRotated(session, tokenId);

			session = await this.sessions.find(payload.sid);
			if (!isLive(session)) throw new ForbiddenException('Access Denied');
		}

		if (this.isInGraceWindow(payload, session)) {
			return this.signAccessOnly(session, refreshToken);
		}

		await this.sessions.revoke(session.id);
		throw new ForbiddenException('Access Denied');
	}

	private isInGraceWindow(
		payload: RefreshTokenPayload,
		session: { prevTokenId: string | null; rotatedAt: Date },
	): boolean {
		return (
			payload.jti === session.prevTokenId &&
			Date.now() - session.rotatedAt.getTime() <= RT_GRACE * 1000
		);
	}

	private signRotated(
		session: SessionWithUser,
		tokenId: string,
	): Promise<Tokens> {
		return this.tokenService.getTokens(
			payloadOf(session),
			tokenId,
			this.tokens,
		);
	}

	private async signAccessOnly(
		session: SessionWithUser,
		refreshToken: string,
	): Promise<Tokens> {
		return {
			access_token: await this.tokenService.signAccessToken(
				payloadOf(session),
				this.tokens,
			),
			refresh_token: refreshToken,
		};
	}

	private async openSession(
		userId: number,
		email: string,
		metadata?: SessionMetadata,
	): Promise<Tokens> {
		const session = await this.sessions.create(
			userId,
			this.tokens.refreshTokenTtl,
			metadata,
		);

		return this.tokenService.getTokens(
			{ sub: userId, email, sid: session.id },
			session.tokenId,
			this.tokens,
		);
	}
}
