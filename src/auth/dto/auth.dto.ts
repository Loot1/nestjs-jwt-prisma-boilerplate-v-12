import { z } from 'zod';

/**
 * Validates the body (`@Body({ schema: authSchema })`), types it, and is what
 * Swagger documents: there is no class next to it to keep in sync.
 */
export const authSchema = z.object({
	email: z.string().min(1).meta({ example: 'test@test.com' }),
	password: z.string().min(1).meta({ example: 'test1234' }),
});

export type AuthDto = z.infer<typeof authSchema>;
