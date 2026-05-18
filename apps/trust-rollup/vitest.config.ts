/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-18 */

import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    env: {
      TRUST_ROLLUP_SNAPSHOT_DIR: path.join(__dirname, '.vitest-snapshots'),
    },
  },
});
