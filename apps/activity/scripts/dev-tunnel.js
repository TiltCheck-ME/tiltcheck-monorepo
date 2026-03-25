/* © 2026 TiltCheck Ecosystem. All Rights Reserved. */

import { spawn } from 'child_process';

/**
 * dev-tunnel.js
 * 
 * Spawns both Vite and Cloudflare Tunnel in parallel.
 * Replaces unreliable shell operators (&, &&, |) for Windows/Unix.
 */

function run(command, args) {
  const child = spawn(command, args, { stdio: 'inherit', shell: true });
  child.on('error', (err) => console.error(`[TiltCheck] Failed to start ${command}:`, err));
  return child;
}

console.log('[TiltCheck] Starting Activity Session (Sensor Link + Discord SDK)...');

// Start Vite
const vite = run('pnpm', ['dev']);

// Start Cloudflare Tunnel
const tunnel = run('pnpm', ['tunnel']);

process.on('SIGINT', () => {
  vite.kill();
  tunnel.kill();
  process.exit();
});
