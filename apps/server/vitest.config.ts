import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.integration.test.ts'],
    testTimeout: 90_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
