import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { loadTestEnv } from './test/test-env.js';

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		globals: true,
		root: './',
		// Unit tests only: they mock their dependencies and need no database.
		// The suites hitting the real database live in `*.e2e-spec.ts`.
		include: ['src/**/*.spec.ts'],
		env: loadTestEnv(),
	},
});
