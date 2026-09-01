import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { loadTestEnv } from './test/test-env';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    env: loadTestEnv(),
    // The suites share a single database, so they cannot run concurrently.
    fileParallelism: false,
    globalSetup: ['./test/global-setup.ts'],
  },
});
