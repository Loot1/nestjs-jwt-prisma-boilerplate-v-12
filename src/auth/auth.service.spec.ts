import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

import { HashingService, TokenService } from '../common/index.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import { TOKEN_OPTIONS } from './auth.constants.js';

const dto = { email: 'test@test.com', password: 'super-secret-password' };
const user = {
	id: 1,
	email: dto.email,
	hash: 'password-hash',
	hashedRt: 'rt-hash',
};
const tokens = { access_token: 'at', refresh_token: 'rt' };

describe('AuthService', () => {
	let service: AuthService;
	let prisma: {
		user: {
			create: ReturnType<typeof vi.fn>;
			findUnique: ReturnType<typeof vi.fn>;
			update: ReturnType<typeof vi.fn>;
			updateMany: ReturnType<typeof vi.fn>;
		};
	};
	let tokenService: { getTokens: ReturnType<typeof vi.fn> };
	let hashingService: {
		hash: ReturnType<typeof vi.fn>;
		verify: ReturnType<typeof vi.fn>;
	};

	beforeEach(async () => {
		prisma = {
			user: {
				create: vi.fn().mockResolvedValue(user),
				findUnique: vi.fn().mockResolvedValue(user),
				update: vi.fn().mockResolvedValue(user),
				updateMany: vi.fn().mockResolvedValue({ count: 1 }),
			},
		};
		tokenService = { getTokens: vi.fn().mockResolvedValue(tokens) };
		hashingService = {
			hash: vi.fn().mockResolvedValue('a-hash'),
			verify: vi.fn().mockResolvedValue(true),
		};

		const moduleRef = await Test.createTestingModule({
			providers: [
				AuthService,
				{ provide: PrismaService, useValue: prisma },
				{ provide: TokenService, useValue: tokenService },
				{ provide: HashingService, useValue: hashingService },
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
			expect(tokenService.getTokens).toHaveBeenCalledWith(
				{ sub: user.id, email: user.email },
				TOKEN_OPTIONS,
			);
		});

		it('rotates the refresh token hash', async () => {
			await service.signupLocal(dto);

			expect(hashingService.hash).toHaveBeenCalledWith(
				tokens.refresh_token,
			);
			expect(prisma.user.update).toHaveBeenCalledWith({
				where: { id: user.id },
				data: { hashedRt: 'a-hash' },
			});
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
		it('clears the refresh token hash of the user', async () => {
			await expect(service.logout(user.id)).resolves.toBe(true);

			expect(prisma.user.updateMany).toHaveBeenCalledWith({
				where: { id: user.id, hashedRt: { not: null } },
				data: { hashedRt: null },
			});
		});
	});

	describe('refreshTokens', () => {
		it('returns a fresh pair when the token matches', async () => {
			await expect(service.refreshTokens(user.id, 'rt')).resolves.toEqual(
				tokens,
			);

			expect(hashingService.verify).toHaveBeenCalledWith(
				user.hashedRt,
				'rt',
			);
		});

		it('rejects a logged out user', async () => {
			prisma.user.findUnique.mockResolvedValue({
				...user,
				hashedRt: null,
			});

			await expect(
				service.refreshTokens(user.id, 'rt'),
			).rejects.toBeInstanceOf(ForbiddenException);
		});

		it('rejects a token that does not match the stored hash', async () => {
			hashingService.verify.mockResolvedValue(false);

			await expect(
				service.refreshTokens(user.id, 'rt'),
			).rejects.toBeInstanceOf(ForbiddenException);
		});
	});
});
