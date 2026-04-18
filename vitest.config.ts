/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'tests/user-wallet-isolated.test.ts',
      'tests/wallet-service-submission.test.ts',
      'packages/agent/app/agent.test.ts',
    ],
    setupFiles: ['./apps/api/tests/setup.ts'],
  },
});
