/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */

import { spawn } from 'child_process';

function run(command, args) {
  const child = spawn(command, args, { stdio: 'inherit', shell: true });
  child.on('error', (err) => console.error(`[TiltCheck] Failed to start ${command}:`, err));
  return child;
}

console.log('[TiltCheck] Starting TiltCheck Activity tunnel session...');

const vite = run('pnpm', ['dev']);
const tunnel = run('pnpm', ['tunnel']);

process.on('SIGINT', () => {
  vite.kill();
  tunnel.kill();
  process.exit();
});
