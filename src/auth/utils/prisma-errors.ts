import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

/** True when the error is a Prisma unique constraint violation (P2002). */
export const isUniqueConstraintViolation = (error: unknown): boolean =>
	error instanceof PrismaClientKnownRequestError && error.code === 'P2002';
