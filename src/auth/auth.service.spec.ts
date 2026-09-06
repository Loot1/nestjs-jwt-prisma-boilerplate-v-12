import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

import { HashingService, TokenService } from '../common/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AT_TTL, RT_GRACE, RT_TTL } from './auth.constants.js';
import { AuthService } from './auth.service.js';
import { SessionService } from './session.service.js';

const dto = { email: 'test@test.com', password: 'super-secret-password' };
const user = { id: 1, email: dto.email, hash: 'password-hash' };
const tokens = { access_token: 'at', refresh_token: 'rt' };

const tokenOptions = {
	accessTokenSecret: 'a'.repeat(32),
	refreshTokenSecret: 'b'.repeat(32),
	accessTokenTtl: AT_TTL,
	refreshTokenTtl: RT_TTL,
};

const env: Record<string, string> = {
	AT_SECRET: tokenOptions.accessTokenSecret,
	RT_SECRET: tokenOptions.refreshTokenSecret,
};

const session = {
	id: 'session-1',
	userId: user.id,
	tokenId: 'token-1',
	prevTokenId: null as string | null,
	rotatedAt: new Date(),
	expiresAt: new Date(Date.now() + tokenOptions.refreshTokenTtl * 1000),
	user: { id: user.id, email: user.email },
};

const payload = {
	sub: user.id,
	email: user.email,
	sid: session.id,
	jti: session.tokenId,
};

describe('AuthService', () => {
	let service: AuthService;
	let prisma: {
		user: {
			create: ReturnType<typeof vi.fn>;
			findUnique: ReturnType<typeof vi.fn>;
		};
	};
	let sessions: {
		create: ReturnType<typeof vi.fn>;
		find: ReturnType<typeof vi.fn>;
		rotate: ReturnType<typeof vi.fn>;
		revoke: ReturnType<typeof vi.fn>;
		revokeAll: ReturnType<typeof vi.fn>;
	};
	let tokenService: {
		getTokens: ReturnType<typeof vi.fn>;
		signAccessToken: ReturnType<typeof vi.fn>;
		verifyRefreshToken: ReturnType<typeof vi.fn>;
	};
	let hashingService: {
		hash: ReturnType<typeof vi.fn>;
		verify: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		prisma = {
			user: {
				create: vi.fn().mockResolvedValue(user),
				findUnique: vi.fn().mockResolvedValue(user),
			},
		};
		sessions = {
			create: vi.fn().mockResolvedValue(session),
			find: vi.fn().mockResolvedValue({ ...session }),
			rotate: vi.fn().mockResolvedValue('token-2'),
			revoke: vi.fn().mockResolvedValue(undefined),
			revokeAll: vi.fn().mockResolvedValue(undefined),
		};
		tokenService = {
			getTokens: vi.fn().mockResolvedValue(tokens),
			signAccessToken: vi.fn().mockResolvedValue('fresh-at'),
			verifyRefreshToken: vi.fn().mockResolvedValue({ ...payload }),
		};
		hashingService = {
			hash: vi.fn().mockResolvedValue('a-hash'),
			verify: vi.fn().mockResolvedValue(true),
		};

		const moduleRef = await Test.createTestingModule({
			providers: [
				AuthService,
				{ provide: PrismaService, useValue: prisma },
				{ provide: SessionService, useValue: sessions },
				{ provide: TokenService, useValue: tokenService },
				{ provide: HashingService, useValue: hashingService },
				{
					provide: ConfigService,
					useValue: { getOrThrow: (key: string) => env[key] },
				},
			],
		}).compile();

		service = moduleRef.get(AuthService);
	});

	describe('signupLocal', () => {
		it('stores the hashed password and returns a fresh pair', async () => {
			await expect(service.signupLocal(dto)).resolves.toEqual(tokens);

			expect(hashingService.hash).toHaveBeenCalledWith(dto.password);
			expect(prisma.user.create).toHaveBeenCalledWith({
				data: { email: dto.email, hash: 'a-hash' },
			});
		});

		it('opens a session and signs the pair against it', async () => {
			await service.signupLocal(dto, { ip: '127.0.0.1' });

			expect(sessions.create).toHaveBeenCalledWith(
				user.id,
				tokenOptions.refreshTokenTtl,
				{ ip: '127.0.0.1' },
			);
			expect(tokenService.getTokens).toHaveBeenCalledWith(
				{ sub: user.id, email: user.email, sid: session.id },
				session.tokenId,
				tokenOptions,
			);
		});

		it('rejects an email already taken', async () => {
			prisma.user.create.mockRejectedValue(
				new PrismaClientKnownRequestError('duplicate', {
					code: 'P2002',
					clientVersion: 'test',
				}),
			);

			await expect(service.signupLocal(dto)).rejects.toBeInstanceOf(
				ForbiddenException,
			);
		});

		it('lets any other storage error bubble up', async () => {
			prisma.user.create.mockRejectedValue(new Error('database is down'));

			await expect(service.signupLocal(dto)).rejects.toThrow(
				'database is down',
			);
		});
	});

	describe('signinLocal', () => {
		it('returns a fresh pair on valid credentials', async () => {
			await expect(service.signinLocal(dto)).resolves.toEqual(tokens);

			expect(prisma.user.findUnique).toHaveBeenCalledWith({
				where: { email: dto.email },
			});
			expect(hashingService.verify).toHaveBeenCalledWith(
				user.hash,
				dto.password,
			);
		});

		it('rejects an unknown email', async () => {
			prisma.user.findUnique.mockResolvedValue(null);

			await expect(service.signinLocal(dto)).rejects.toBeInstanceOf(
				ForbiddenException,
			);
		});

		it('rejects a wrong password', async () => {
			hashingService.verify.mockResolvedValue(false);

			await expect(service.signinLocal(dto)).rejects.toBeInstanceOf(
				ForbiddenException,
			);
		});
	});

	describe('logout', () => {
		it('ends this session only', async () => {
			await expect(service.logout(session.id)).resolves.toBe(true);

			expect(sessions.revoke).toHaveBeenCalledWith(session.id);
			expect(sessions.revokeAll).not.toHaveBeenCalled();
		});

		it('ends every session of the user on logout/all', async () => {
			await expect(service.logoutEverywhere(user.id)).resolves.toBe(true);

			expect(sessions.revokeAll).toHaveBeenCalledWith(user.id);
		});
	});

	describe('refresh', () => {
		it('rotates the session and returns a fresh pair', async () => {
			await expect(service.refresh('rt')).resolves.toEqual(tokens);

			expect(sessions.rotate).toHaveBeenCalledWith(
				session.id,
				session.tokenId,
				tokenOptions.refreshTokenTtl,
			);
			expect(tokenService.getTokens).toHaveBeenCalledWith(
				{ sub: user.id, email: user.email, sid: session.id },
				'token-2',
				tokenOptions,
			);
		});

		it('rejects a token that does not verify', async () => {
			tokenService.verifyRefreshToken.mockRejectedValue(
				new Error('invalid signature'),
			);

			await expect(service.refresh('rt')).rejects.toBeInstanceOf(
				ForbiddenException,
			);
			expect(sessions.rotate).not.toHaveBeenCalled();
		});

		it('rejects a token whose session was revoked', async () => {
			sessions.find.mockResolvedValue(null);

			await expect(service.refresh('rt')).rejects.toBeInstanceOf(
				ForbiddenException,
			);
		});

		it('rejects a token whose session has expired', async () => {
			sessions.find.mockResolvedValue({
				...session,
				expiresAt: new Date(Date.now() - 1000),
			});

			await expect(service.refresh('rt')).rejects.toBeInstanceOf(
				ForbiddenException,
			);
			expect(sessions.rotate).not.toHaveBeenCalled();
		});

		it('hands back an access token only inside the grace window', async () => {
			sessions.find.mockResolvedValue({
				...session,
				tokenId: 'token-2',
				prevTokenId: payload.jti,
				rotatedAt: new Date(Date.now() - 5_000),
			});

			await expect(service.refresh('rt')).resolves.toEqual({
				access_token: 'fresh-at',
				refresh_token: 'rt',
			});

			expect(sessions.rotate).not.toHaveBeenCalled();
			expect(sessions.revoke).not.toHaveBeenCalled();
		});

		it('revokes the session when the token was rotated out long ago', async () => {
			sessions.find.mockResolvedValue({
				...session,
				tokenId: 'token-2',
				prevTokenId: payload.jti,
				rotatedAt: new Date(Date.now() - (RT_GRACE + 10) * 1000),
			});

			await expect(service.refresh('rt')).rejects.toBeInstanceOf(
				ForbiddenException,
			);
			expect(sessions.revoke).toHaveBeenCalledWith(session.id);
		});

		it('revokes the session on a token it never issued for it', async () => {
			sessions.find.mockResolvedValue({
				...session,
				tokenId: 'token-9',
				prevTokenId: 'token-8',
			});

			await expect(service.refresh('rt')).rejects.toBeInstanceOf(
				ForbiddenException,
			);
			expect(sessions.revoke).toHaveBeenCalledWith(session.id);
		});

		it('falls back to the grace window when it loses the rotation', async () => {
			sessions.rotate.mockResolvedValue(null);
			sessions.find
				.mockResolvedValueOnce({ ...session })
				.mockResolvedValueOnce({
					...session,
					tokenId: 'token-2',
					prevTokenId: payload.jti,
					rotatedAt: new Date(),
				});

			await expect(service.refresh('rt')).resolves.toEqual({
				access_token: 'fresh-at',
				refresh_token: 'rt',
			});
			expect(sessions.rotate).toHaveBeenCalledTimes(1);
			expect(sessions.revoke).not.toHaveBeenCalled();
		});

		it('revokes the session when it loses the rotation to a stranger', async () => {
			sessions.rotate.mockResolvedValue(null);
			sessions.find
				.mockResolvedValueOnce({ ...session })
				.mockResolvedValueOnce({
					...session,
					tokenId: 'token-9',
					prevTokenId: 'token-8',
				});

			await expect(service.refresh('rt')).rejects.toBeInstanceOf(
				ForbiddenException,
			);
			expect(sessions.revoke).toHaveBeenCalledWith(session.id);
		});
	});
});
