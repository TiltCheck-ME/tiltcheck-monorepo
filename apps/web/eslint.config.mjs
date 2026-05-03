// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03
import { defineConfig, globalIgnores } from 'eslint/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import { sharedIgnorePatterns, sharedTypeScriptRules } from '../../eslint.config.js';

const WEB_DIR = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig([
  ...nextCoreWebVitals,
  globalIgnores([
    ...sharedIgnorePatterns,
    'out/**',
    'public/**',
    'next-env.d.ts',
    'dist/types/**',
  ]),
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: WEB_DIR,
      },
    },
    rules: sharedTypeScriptRules,
  },
]);
