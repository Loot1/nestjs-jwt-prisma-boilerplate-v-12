import { existsSync } from 'node:fs';
import { config } from 'dotenv';

/**
 * The tests always run against this database, never against the one declared
 * in `.env/.env.dev`. The file is git-ignored: copy `.env/.env.example` and
 * point it at your own test database.
 */
export const TEST_ENV_FILE = '.env/.env.test';

export function loadTestEnv(): Record<string, string> {
	if (!existsSync(TEST_ENV_FILE)) {
		throw new Error(
			`Missing ${TEST_ENV_FILE}. Copy .env/.env.example and point it at your test database.`,
		);
	}

	const { parsed } = config({ path: TEST_ENV_FILE });
	if (!parsed?.DATABASE_URL) {
		throw new Error(`DATABASE_URL is not defined in ${TEST_ENV_FILE}.`);
	}

	return parsed;
}
