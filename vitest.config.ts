import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/user-wallet-isolated.test.ts', 'packages/agent/app/agent.test.ts'],
    setupFiles: ['./apps/api/tests/setup.ts'],
  },
});
