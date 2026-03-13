import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      // your environment variables
    },
    setupFiles: ['./tests/test-setup.ts'],
  },
});
