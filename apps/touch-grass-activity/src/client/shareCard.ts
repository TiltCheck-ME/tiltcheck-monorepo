// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Draws the end-of-break share card to a PNG for Discord's share dialog.

import { COPY } from './copy.js';
import type { BreakResultCard } from './views/break.js';

export async function drawShareCard(r: BreakResultCard): Promise<Blob | null> {
  const W = 1200;
  const H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#0b1210';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#17c3a5';
  ctx.fillRect(0, 0, W, 12);
  ctx.fillStyle = '#9fb3ad';
  ctx.font = '600 32px system-ui, sans-serif';
  ctx.fillText('TILTCHECK / TOUCH GRASS', 64, 96);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 150px system-ui, sans-serif';
  ctx.fillText(`${r.minutes}:00`, 64, 270);
  ctx.font = '600 36px system-ui, sans-serif';
  ctx.fillStyle = '#17c3a5';
  ctx.fillText(COPY.brk.stuckIt.toUpperCase(), 64, 350);
  ctx.fillStyle = '#ffffff';
  ctx.font = '500 40px system-ui, sans-serif';
  const names = r.stuck.length ? r.stuck.join(', ') : COPY.brk.nobodyStuck;
  wrap(ctx, names, 64, 405, W - 128, 50, 2);
  if (r.bailed.length) {
    ctx.fillStyle = '#ff8a5c';
    ctx.font = '500 30px system-ui, sans-serif';
    wrap(ctx, `${COPY.brk.bailedList}: ${r.bailed.map((b) => `${b.name} at ${b.at}`).join(', ')}`, 64, 540, W - 128, 38, 2);
  }
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number, maxLines: number): void {
  const words = text.split(' ');
  let line = '';
  let lines = 0;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > max && line) {
      ctx.fillText(line, x, y + lines * lh);
      lines += 1;
      line = w;
      if (lines >= maxLines) return;
    } else line = test;
  }
  if (line && lines < maxLines) ctx.fillText(line, x, y + lines * lh);
}
