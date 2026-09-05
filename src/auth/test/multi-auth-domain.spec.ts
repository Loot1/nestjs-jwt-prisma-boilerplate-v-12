/**
 * Documents (and checks) how a second authentication domain is declared on top
 * of the auth kernel: one `createAuthDomain()` call and a service saying where
 * its users live, without touching the `src/auth-user` domain.
 */
import { INestApplication, Injectable, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../app.module.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { createAuthDomain } from '../../common/modules/index.js';
import { BaseAuthService, HashingService, TokenService } from '../services/index.js';
import { AuthUser } from '../types/index.js';

const rows: AuthUser[] = [];
let seq = 100;

@Injectable()
class AdminAuthService extends BaseAuthService {
	constructor(tokenService: TokenService, hashingService: HashingService) {
		super(tokenService, hashingService);
	}

	protected createUser(email: string, hash: string): Promise<AuthUser> {
		const row = { id: ++seq, email, hash, hashedRt: null };
		rows.push(row);
		return Promise.resolve(row);
	}

	protected findUserByEmail(email: string): Promise<AuthUser | null> {
		return Promise.resolve(rows.find((r) => r.email === email) ?? null);
	}

	protected findUserById(id: number): Promise<AuthUser | null> {
		return Promise.resolve(rows.find((r) => r.id === id) ?? null);
	}

	protected async saveRefreshTokenHash(id: number, hashedRt: string) {
		rows.find((r) => r.id === id)!.hashedRt = hashedRt;
	}

	protected async clearRefreshTokenHash(id: number) {
		const row = rows.find((r) => r.id === id);
		if (row) row.hashedRt = null;
	}
}

const adminAuthDomain = createAuthDomain({
	authService: AdminAuthService,
	path: 'admin/auth',
	tag: 'admin-auth',
	jwt: {
		accessTokenStrategyName: 'admin-jwt',
		refreshTokenStrategyName: 'admin-jwt-refresh',
		accessTokenSecretEnv: 'ADMIN_AT_SECRET',
		refreshTokenSecretEnv: 'ADMIN_RT_SECRET',
		accessTokenExpiresIn: '5m',
	},
});

describe('two auth domains side by side', () => {
	let app: INestApplication;

	beforeAll(async () => {
		process.env.ADMIN_AT_SECRET = 'admin-at-secret';
		process.env.ADMIN_RT_SECRET = 'admin-rt-secret';

		const moduleRef = await Test.createTestingModule({
			imports: [AppModule, adminAuthDomain.module],
		})
			// the second domain has its own storage, the user one is not exercised here
			.overrideProvider(PrismaService)
			.useValue({ user: {} })
			.compile();

		app = moduleRef.createNestApplication();
		app.useGlobalPipes(new ValidationPipe());
		await app.init();
	});

	afterAll(async () => {
		await app.close();
	});

	it('signs up, refreshes and logs out on the admin domain', async () => {
		const dto = { email: 'root@admin.io', password: 'admin-password' };

		const signup = await request(app.getHttpServer())
			.post('/admin/auth/local/signup')
			.send(dto)
			.expect(201);
		expect(rows).toHaveLength(1);

		await request(app.getHttpServer())
			.post('/admin/auth/refresh')
			.set('Authorization', `Bearer ${signup.body.refresh_token}`)
			.expect(200);

		await request(app.getHttpServer())
			.post('/admin/auth/logout')
			.set('Authorization', `Bearer ${signup.body.access_token}`)
			.expect(200);
		expect(rows[0].hashedRt).toBeNull();
	});

	it('validates the payload and rejects anonymous calls', async () => {
		await request(app.getHttpServer())
			.post('/admin/auth/local/signup')
			.send({ email: 'no-password@admin.io' })
			.expect(400);

		await request(app.getHttpServer())
			.post('/admin/auth/logout')
			.expect(401);
	});

	it('does not let a token cross over to the other domain', async () => {
		const admin = await request(app.getHttpServer())
			.post('/admin/auth/local/signin')
			.send({ email: 'root@admin.io', password: 'admin-password' })
			.expect(200);

		// the global guard runs the user strategy: the admin token is not accepted
		await request(app.getHttpServer())
			.post('/auth/logout')
			.set('Authorization', `Bearer ${admin.body.access_token}`)
			.expect(401);

		// and an admin access token is not an admin refresh token
		await request(app.getHttpServer())
			.post('/admin/auth/refresh')
			.set('Authorization', `Bearer ${admin.body.access_token}`)
			.expect(401);
	});
});
