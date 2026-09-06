import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type { SessionModel } from '../generated/prisma/models.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type SessionMetadata = {
	userAgent?: string;
	ip?: string;
};

export type SessionWithUser = SessionModel & {
	user: { id: number; email: string };
};

const expiresIn = (seconds: number): Date =>
	new Date(Date.now() + seconds * 1000);

@Injectable()
export class SessionService {
	constructor(private prisma: PrismaService) {}

	create(
		userId: number,
		ttl: number,
		metadata: SessionMetadata = {},
	): Promise<SessionModel> {
		return this.prisma.session.create({
			data: {
				userId,
				tokenId: randomUUID(),
				expiresAt: expiresIn(ttl),
				userAgent: metadata.userAgent,
				ip: metadata.ip,
			},
		});
	}

	find(id: string): Promise<SessionWithUser | null> {
		return this.prisma.session.findUnique({
			where: { id },
			include: { user: { select: { id: true, email: true } } },
		});
	}

	async rotate(
		id: string,
		currentTokenId: string,
		ttl: number,
	): Promise<string | null> {
		const tokenId = randomUUID();

		const { count } = await this.prisma.session.updateMany({
			where: { id, tokenId: currentTokenId },
			data: {
				tokenId,
				prevTokenId: currentTokenId,
				rotatedAt: new Date(),
				expiresAt: expiresIn(ttl),
			},
		});

		return count === 1 ? tokenId : null;
	}

	async revoke(id: string): Promise<void> {
		await this.prisma.session.deleteMany({ where: { id } });
	}

	async revokeAll(userId: number): Promise<void> {
		await this.prisma.session.deleteMany({ where: { userId } });
	}

	listFor(userId: number): Promise<SessionModel[]> {
		return this.prisma.session.findMany({
			where: { userId, expiresAt: { gt: new Date() } },
			orderBy: { createdAt: 'desc' },
		});
	}
}
