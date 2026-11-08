/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.join(workspaceRoot, 'apps/web/src'),
    },
  },
  test: {
    include: [
      'tests/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'apps/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'packages/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'modules/**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.turbo/**',
      'archive/**',
      'apps/web/.next/**',
      'tests/e2e/**',
      'modules/justthetip/**',
      'packages/solana-vault/tests/dual-wallet.test.ts',
      'packages/agent/tests/integration/**',
      'tests/landing-image-integration.spec.ts',
      'tests/web-auth-ui.test.ts',
      'tests/web-index-stats.test.ts',
      'tests/web-suslink-validation.test.ts',
      'tests/web-xss-hardening.test.ts',
    ],
    setupFiles: [path.join(workspaceRoot, 'apps/api/tests/setup.ts')],
  },
});
