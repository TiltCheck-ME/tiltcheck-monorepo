// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03
import { defineConfig } from 'eslint/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSharedConfig } from '../../eslint.config.js';

const AGENT_DIR = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig([
  ...createSharedConfig({
    tsconfigRootDir: AGENT_DIR,
    extraIgnores: ['deployment/**', '.cloudbuild/**'],
    typeScriptRuleOverrides: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  }),
]);
