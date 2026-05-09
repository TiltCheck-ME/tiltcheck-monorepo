/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
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
      'apps/web/.next/**',
      'tests/e2e/**',
    ],
    setupFiles: [path.join(workspaceRoot, 'apps/api/tests/setup.ts')],
  },
});
