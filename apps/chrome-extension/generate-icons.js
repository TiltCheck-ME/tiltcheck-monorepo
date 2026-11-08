// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-08
/**
 * Icon generator dispatcher for TiltCheck extension.
 * Calls Python Pillow engine to render high-resolution brand shield assets.
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pyScript = path.join(__dirname, 'generate-icons.py');

const res = spawnSync('python', [pyScript], { stdio: 'inherit' });
if (res.status !== 0) {
  process.exit(res.status ?? 1);
}
