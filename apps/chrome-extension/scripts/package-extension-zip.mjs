/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-02 */
/**
 * Zip apps/chrome-extension/dist into the web download CTA path.
 * Sideload package must match current Core build — never ship a stale zip.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  statSync,
  unlinkSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extRoot = path.resolve(__dirname, '..');
const distDir = path.join(extRoot, 'dist');
const zipName = 'tiltcheck-extension.zip';
const localZip = path.join(extRoot, zipName);
const webDownloads = path.resolve(extRoot, '../web/public/downloads');
const webZip = path.join(webDownloads, zipName);
const stagingDir = path.join(extRoot, '.dist-package');

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

// Stage clean dist without source maps
if (existsSync(stagingDir)) try {
  rmSync(stagingDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
} catch {
  // Ignore Windows handle release lag
}
mkdirSync(stagingDir, { recursive: true });

function copyFiltered(src, dest) {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.endsWith('.map') || entry.name.startsWith('.')) continue;
    const sPath = path.join(src, entry.name);
    const dPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyFiltered(sPath, dPath);
    } else {
      copyFileSync(sPath, dPath);
    }
  }
}

copyFiltered(distDir, stagingDir);

if (process.platform === 'win32') {
  const escapedStaging = stagingDir.replace(/\\/g, '\\\\');
  const escapedZip = localZip.replace(/\\/g, '\\\\');
  const psScript = `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${escapedStaging}', '${escapedZip}')`;
  const res = spawnSync('powershell.exe', ['-NoProfile', '-Command', psScript], {
    stdio: 'inherit',
  });
  if (res.status !== 0) {
    console.error('PowerShell zip creation failed');
    try {
  rmSync(stagingDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
} catch {
  // Ignore Windows handle release lag
}
    process.exit(res.status ?? 1);
  }
} else {
  const zipResult = spawnSync(
    'zip',
    ['-r', '-q', localZip, '.'],
    {
      cwd: stagingDir,
      stdio: 'inherit',
    },
  );
  if (zipResult.status !== 0) {
    console.error('zip failed');
    try {
  rmSync(stagingDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
} catch {
  // Ignore Windows handle release lag
}
    process.exit(zipResult.status ?? 1);
  }
}

try {
  rmSync(stagingDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
} catch {
  // Ignore Windows handle release lag
}

mkdirSync(webDownloads, { recursive: true });
copyFileSync(localZip, webZip);

const bytes = statSync(webZip).size;
console.log(`Packaged ${zipName} (${bytes} bytes)`);
console.log(`  ${localZip}`);
console.log(`  ${webZip}`);
