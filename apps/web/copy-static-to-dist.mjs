import { cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(rootDir, 'dist');

const excludedNames = new Set([
  '.gitignore',
  '.nojekyll',
  '.turbo',
  '.vercel',
  'dist',
  'node_modules',
  'Dockerfile',
  'README.md',
  'package.json',
  'pnpm-lock.yaml',
  'copy-static-to-dist.mjs',
]);

await mkdir(distDir, { recursive: true });

const entries = await readdir(rootDir, { withFileTypes: true });
for (const entry of entries) {
  if (excludedNames.has(entry.name)) continue;

  // Keep Vite-generated index.html untouched.
  // Static files under /assets (icons, logos, etc.) must be copied for legacy HTML pages.
  if (entry.name === 'index.html') continue;

  const sourcePath = path.join(rootDir, entry.name);
  const targetPath = path.join(distDir, entry.name);

  await cp(sourcePath, targetPath, {
    recursive: true,
    force: false,
    errorOnExist: false,
  });
}
