/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 */
/**
 * Zip apps/chrome-extension/dist into the web download CTA path.
 * Sideload package must match current Core build — never ship a stale Dec zip.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extRoot = path.resolve(__dirname, '..');
const distDir = path.join(extRoot, 'dist');
const zipName = 'tiltcheck-extension.zip';
const localZip = path.join(extRoot, zipName);
const webDownloads = path.resolve(extRoot, '../web/public/downloads');
const webZip = path.join(webDownloads, zipName);

const required = [
  'manifest.json',
  'content.js',
  'background.js',
  'page-bridge.js',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png',
];

if (!existsSync(distDir)) {
  console.error('dist/ missing — run pnpm build first');
  process.exit(1);
}

for (const rel of required) {
  if (!existsSync(path.join(distDir, rel))) {
    console.error(`Missing required dist file: ${rel}`);
    process.exit(1);
  }
}

for (const zipPath of [localZip, webZip]) {
  if (existsSync(zipPath)) unlinkSync(zipPath);
}

// Fresh archive only — exclude source maps from the sideload download.
const zipResult = spawnSync(
  'zip',
  ['-r', '-q', localZip, '.', '-x', '*.map', '-x', '*/.*'],
  {
    cwd: distDir,
    stdio: 'inherit',
  },
);

if (zipResult.status !== 0) {
  console.error('zip failed');
  process.exit(zipResult.status ?? 1);
}

mkdirSync(webDownloads, { recursive: true });
copyFileSync(localZip, webZip);

const bytes = statSync(webZip).size;
console.log(`Packaged ${zipName} (${bytes} bytes)`);
console.log(`  ${localZip}`);
console.log(`  ${webZip}`);
