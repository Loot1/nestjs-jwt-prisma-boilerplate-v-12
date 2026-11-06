import { z } from 'zod';

const secret = (name: string) =>
	z
		.string()
		.min(32, `${name} must be at least 32 characters (openssl rand -hex 32).`);

/**
 * Every variable the app reads, checked at boot by `ConfigModule`
 * (`validationSchema`). Variables it doesn't declare stay readable as they
 * are; the ones it declares are served as parsed here (`PORT` is a number).
 */
export const envSchema = z.object({
	NODE_ENV: z
		.enum(['development', 'production', 'test'])
		.default('development'),
	PORT: z.coerce.number().int().min(1).default(3333),
	DATABASE_URL: z.string().min(1),
	SHADOW_DATABASE_URL: z.string().optional(),
	AT_SECRET: secret('AT_SECRET'),
	RT_SECRET: secret('RT_SECRET'),
});

export type Env = z.infer<typeof envSchema>;
