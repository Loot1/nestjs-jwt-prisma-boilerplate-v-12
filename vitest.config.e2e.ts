import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { loadTestEnv } from './test/test-env.js';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: loadTestEnv(),
    // The suites share a single database, so they cannot run concurrently.
    fileParallelism: false,
    globalSetup: ['./test/global-setup.ts'],
  },
});
