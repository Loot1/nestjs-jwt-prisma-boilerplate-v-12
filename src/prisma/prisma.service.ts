import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
	extends PrismaClient
	implements OnModuleInit, OnModuleDestroy
{
	constructor(config: ConfigService) {
		const url = config.getOrThrow<string>('DATABASE_URL');

		super({ adapter: new PrismaMariaDb(url) });
	}

	async onModuleInit() {
		await this.$connect();
	}

	async onModuleDestroy() {
		await this.$disconnect();
	}

	async cleanDatabase() {
		if (process.env.NODE_ENV === 'production') return;

		// teardown logic; sessions first, they point at the users.
		await this.session.deleteMany();
		await this.user.deleteMany();
	}
}
