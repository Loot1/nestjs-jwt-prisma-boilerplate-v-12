import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { loadTestEnv } from './test-env.js';

const require = createRequire(import.meta.url);

/**
 * Prepares the test database before any test file runs: the schema is brought
 * up to date by applying the migrations of `prisma/migrations`. Each suite then
 * wipes its own data through `PrismaService.cleanDatabase()`.
 */
export default function setup() {
	const env = loadTestEnv();

	try {
		execFileSync(
			process.execPath,
			[require.resolve('prisma/build/index.js'), 'migrate', 'deploy'],
			{ stdio: 'inherit', env: { ...process.env, ...env } },
		);
	} catch {
		throw new Error(
			`Could not migrate the test database (${env.DATABASE_URL}), see the Prisma output above.`,
		);
	}
}
