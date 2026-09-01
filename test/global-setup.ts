import { execFileSync } from 'node:child_process';
import { loadTestEnv } from './test-env';

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
