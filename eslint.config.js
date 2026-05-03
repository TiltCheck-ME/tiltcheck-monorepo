// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03
import { defineConfig, globalIgnores } from 'eslint/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));

export const sharedIgnorePatterns = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/.cache/**',
  '**/.eslintcache',
  '**/.idea/**',
  '**/.vscode/**',
  '**/packages/comic-generator/**',
];

export const sharedTypeScriptRules = {
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-unsafe-function-type': 'off',
  'no-case-declarations': 'off',
  'no-empty': 'off',
  'prefer-const': 'warn',
};

export function createSharedConfig({
  tsconfigRootDir = ROOT_DIR,
  extraIgnores = [],
  typeScriptRuleOverrides = {},
} = {}) {
  return [
    globalIgnores([...sharedIgnorePatterns, ...extraIgnores]),
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
      files: ['**/*.{ts,tsx,mts,cts}'],
      languageOptions: {
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          tsconfigRootDir,
        },
      },
      rules: {
        ...sharedTypeScriptRules,
        ...typeScriptRuleOverrides,
      },
    },
  ];
}

export default defineConfig(createSharedConfig());
