import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './../src/app.module.js';
import { AuthDto } from '../src/auth/dto/index.js';
import { Tokens } from '../src/common/index.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('AppController (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;

	beforeAll(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		app.useGlobalPipes(new ValidationPipe());
		await app.init();

		prisma = app.get<PrismaService>(PrismaService);
		await prisma.cleanDatabase();
	});

	afterAll(async () => {
		await app.close();
	});

	describe('Auth', () => {
		const dto: AuthDto = {
			email: 'test@gmail.com',
			password: 'super-secret-password',
		};

		let tokens: Tokens;

		it('should signup', () => {
			return request(app.getHttpServer())
				.post('/auth/local/signup')
				.send(dto)
				.expect(201)
				.expect(({ body }: { body: Tokens }) => {
					expect(body.access_token).toBeTruthy();
					expect(body.refresh_token).toBeTruthy();
				});
		});

		it('should signin', () => {
			return request(app.getHttpServer())
				.post('/auth/local/signin')
				.send(dto)
				.expect(200)
				.expect(({ body }: { body: Tokens }) => {
					expect(body.access_token).toBeTruthy();
					expect(body.refresh_token).toBeTruthy();

					tokens = body;
				});
		});

		it('should refresh tokens', async () => {
			await new Promise((resolve) => {
				setTimeout(() => {
					resolve(true);
				}, 1000);
			});

			return request(app.getHttpServer())
				.post('/auth/refresh')
				.auth(tokens.refresh_token, {
					type: 'bearer',
				})
				.expect(200)
				.expect(({ body }: { body: Tokens }) => {
					expect(body.access_token).toBeTruthy();
					expect(body.refresh_token).toBeTruthy();

					expect(body.refresh_token).not.toBe(tokens.access_token);
					expect(body.refresh_token).not.toBe(tokens.refresh_token);

					tokens = body;
				});
		});

		it('should logout', () => {
			return request(app.getHttpServer())
				.post('/auth/logout')
				.auth(tokens.access_token, {
					type: 'bearer',
				})
				.expect(200);
		});
	});

	describe('Sessions', () => {
		const dto: AuthDto = {
			email: 'sessions@gmail.com',
			password: 'super-secret-password',
		};

		let first: Tokens;
		let second: Tokens;

		beforeAll(async () => {
			const signup = await request(app.getHttpServer())
				.post('/auth/local/signup')
				.send(dto)
				.expect(201);
			first = signup.body as Tokens;

			const signin = await request(app.getHttpServer())
				.post('/auth/local/signin')
				.send(dto)
				.expect(200);
			second = signin.body as Tokens;
		});

		it('keeps both devices signed in', async () => {
			const res = await request(app.getHttpServer())
				.get('/auth/sessions')
				.auth(first.access_token, { type: 'bearer' })
				.expect(200);

			expect((res.body as unknown[]).length).toBe(2);
		});

		it('lets parallel refreshes through on a single rotation', async () => {
			const responses = await Promise.all(
				Array.from({ length: 5 }, () =>
					request(app.getHttpServer())
						.post('/auth/refresh')
						.auth(second.refresh_token, { type: 'bearer' }),
				),
			);

			for (const res of responses) expect(res.status).toBe(200);
		});

		it('logs out one device without touching the other', async () => {
			await request(app.getHttpServer())
				.post('/auth/logout')
				.auth(first.access_token, { type: 'bearer' })
				.expect(200);

			await request(app.getHttpServer())
				.post('/auth/refresh')
				.auth(first.refresh_token, { type: 'bearer' })
				.expect(403);

			const res = await request(app.getHttpServer())
				.get('/auth/sessions')
				.auth(second.access_token, { type: 'bearer' })
				.expect(200);

			expect((res.body as unknown[]).length).toBe(1);
		});

		it('revokes the session on a token replayed past the grace window', async () => {
			await prisma.session.updateMany({
				where: { user: { email: dto.email } },
				data: { rotatedAt: new Date(0) },
			});

			await request(app.getHttpServer())
				.post('/auth/refresh')
				.auth(second.refresh_token, { type: 'bearer' })
				.expect(403);

			expect(
				await prisma.session.count({
					where: { user: { email: dto.email } },
				}),
			).toBe(0);
		});
	});
});
