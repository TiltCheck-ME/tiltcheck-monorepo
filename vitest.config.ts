import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const r = (p: string) => path.resolve(__dirname, p);
const isCI = process.env.CI === 'true';

export default defineConfig({
  resolve: {
    alias: {
      '@tiltcheck/event-router': r('services/event-router/src/index.ts'),
      '@tiltcheck/types': r('packages/types/src/index.ts'),
      '@tiltcheck/discord-utils': r('packages/discord-utils/src/index.ts'),
      '@tiltcheck/database': r('packages/database/src/index.ts'),
      '@tiltcheck/suslink': r('modules/suslink/src/index.ts'),
      '@tiltcheck/identity-core': r('packages/identity-core/src/index.ts'),
      '@tiltcheck/config': r('packages/config/src/index.ts'),
      '@tiltcheck/natural-language-parser': r('packages/natural-language-parser/src/index.ts'),
      '@tiltcheck/pricing-oracle': r('services/pricing-oracle/src/index.ts'),
      '@tiltcheck/collectclock': r('modules/collectclock/src/index.ts'),
      '@tiltcheck/ai-client': r('packages/ai-client/src/index.ts'),
    },
  },
  test: {
    include: [
      'tests/**/*.test.{ts,tsx}',
      'apps/**/*.test.{ts,tsx}',
      'modules/**/*.test.{ts,tsx}',
      'services/**/*.test.{ts,tsx}',
      'packages/**/*.test.{ts,tsx}',
    ],
    exclude: [
      'node_modules',
      'apps/**/node_modules/**',
      'modules/**/node_modules/**',
      'services/**/node_modules/**',
      'packages/**/node_modules/**',
      '**/dist/**',
      '**/.*/**',
    ],
    environment: 'node',
    env: {
      TRUST_ROLLUP_SNAPSHOT_DIR: r('.test-data'),
    },
    coverage: {
      reporter: ['text', 'html'],
      provider: 'v8',
      reportsDirectory: './coverage',
      include: [
        'apps/**/src/**/*.{ts,tsx}',
        'modules/**/src/**/*.{ts,tsx}',
        'services/**/src/**/*.{ts,tsx}',
        'packages/**/src/**/*.{ts,tsx}',
      ],
      exclude: [
        '**/*.test.{ts,tsx}',
        '**/dist/**',
        '**/src/index.ts',
        '**/src/index.tsx',
        '**/*.d.ts',
        // Exclude placeholder and app code until tests are added
        'apps/**',
        // Modules without tests yet - add coverage when tests are implemented
        'modules/collectclock/**',
        'modules/justthetip/**',
        'modules/poker/**', // Poker game module (not yet tested)
        // Database package uses external services
        'packages/database/**',
        // Discord utils - embed builders and adapters need Discord context
        'packages/discord-utils/src/embeds.ts',
        'packages/discord-utils/src/trust-adapter.ts',
        // NLP parser - complex parsing logic needs dedicated test suite
        'packages/natural-language-parser/**',
        // Supabase auth - requires Supabase environment for testing
        'packages/supabase-auth/src/client.ts',
        'packages/supabase-auth/src/middleware.ts',
        // Auth package - requires complex auth environment setup
        'packages/auth/**',
        // Analytics client - requires analytics service environment
        'packages/analytics/**',
        // Utils package - generic utilities requiring various external dependencies
        'packages/utils/**',
        // Services requiring external dependencies or infrastructure
        'services/casino-data-api/**', // CLI tool for casino data collection
        'services/game-arena/**', // Game server requiring WebSocket setup
        // PWA/client-side code - needs browser environment
        'services/gameplay-analyzer/src/pwa/**',
        'services/gameplay-analyzer/src/provably-fair/index.ts',
      ],
      thresholds: isCI
        ? {
            lines: 60,
            statements: 60,
            functions: 50,
            branches: 50,
          }
        : undefined,
    },
  },
});
