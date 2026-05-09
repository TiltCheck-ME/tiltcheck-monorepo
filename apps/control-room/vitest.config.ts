/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-07 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      ADMIN_PASSWORD: 'test-control-room-admin-password',
      SESSION_SECRET: 'test-control-room-session-secret',
    },
    include: ['tests/**/*.test.ts'],
  },
});
