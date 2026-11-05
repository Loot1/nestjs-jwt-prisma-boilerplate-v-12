import { defineConfig } from 'prisma/config';

// No dotenv here: the `db:*` scripts pick the file with `node --env-file`,
// so a command always says which database it targets. `process.env` rather
// than `env()`, which throws when the variable is missing: `prisma generate`
// (postinstall) needs no database and must run without any env file.
export default defineConfig({
	schema: 'prisma/schema.prisma',
	migrations: {
		path: 'prisma/migrations',
	},
	datasource: {
		url: process.env.DATABASE_URL,
		shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
	},
});
