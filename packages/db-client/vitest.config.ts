// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    environment: 'node',
  },
});
