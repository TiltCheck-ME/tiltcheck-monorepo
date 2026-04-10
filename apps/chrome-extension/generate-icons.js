// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
// Generates brand-consistent PNG icons for the Chrome Extension.
// Pure Node.js — no external dependencies required.

import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Brand colors
// ---------------------------------------------------------------------------
const TEAL   = [0x17, 0xc3, 0xb2, 0xff];
const DARK   = [0x08, 0x0a, 0x0e, 0xff];
const WHITE  = [0xff, 0xff, 0xff, 0xff];
const TRANSP = [0x00, 0x00, 0x00, 0x00];

// ---------------------------------------------------------------------------
// PNG encoder (pure Node.js, no extra deps)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const tb  = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([len, tb, data, crc]);
}

function encodePNG(w, h, pixels) {
  // pixels: Uint8Array, w*h*4 (RGBA)
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  const stride = w * 4;
  const raw = Buffer.alloc(h * (1 + stride));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + stride)] = 0; // filter: None
    pixels.copy(raw, y * (1 + stride) + 1, y * stride, y * stride + stride);
  }

  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

// ---------------------------------------------------------------------------
// Drawing primitives
// ---------------------------------------------------------------------------

function buf(w, h) { return Buffer.alloc(w * h * 4); }

function setPixel(px, w, x, y, color) {
  if (x < 0 || y < 0 || x >= w || y >= Math.floor(px.length / (w * 4))) return;
  const i = (y * w + x) * 4;
  px[i] = color[0]; px[i+1] = color[1]; px[i+2] = color[2]; px[i+3] = color[3];
}

function fillRect(px, w, x1, y1, x2, y2, color) {
  for (let y = y1; y <= y2; y++)
    for (let x = x1; x <= x2; x++)
      setPixel(px, w, x, y, color);
}

// Filled rounded rectangle
function fillRoundRect(px, w, h, x, y, rw, rh, r, color) {
  for (let py = y; py < y + rh; py++) {
    for (let px2 = x; px2 < x + rw; px2++) {
      const dx = px2 < x + r ? x + r - px2 : px2 >= x + rw - r ? px2 - (x + rw - r - 1) : 0;
      const dy = py < y + r ? y + r - py : py >= y + rh - r ? py - (y + rh - r - 1) : 0;
      if (dx * dx + dy * dy <= r * r + r) setPixel(px, w, px2, py, color);
    }
  }
}

// Draw letter "T" (white) in a bounding box
function drawT(px, w, bx, by, bw, bh, color) {
  const barH  = Math.round(bh * 0.20);
  const stemW = Math.round(bw * 0.32);
  const stemX = bx + Math.round((bw - stemW) / 2);
  fillRect(px, w, bx, by, bx + bw - 1, by + barH - 1, color);          // horizontal bar
  fillRect(px, w, stemX, by + barH, stemX + stemW - 1, by + bh - 1, color); // vertical stem
}

// Draw letter "C" (white) in a bounding box
function drawC(px, w, bx, by, bw, bh, color) {
  const thick  = Math.max(2, Math.round(bw * 0.20));
  const gapTop = Math.round(bh * 0.25);
  const gapBot = Math.round(bh * 0.25);
  // Left stroke
  fillRect(px, w, bx, by, bx + thick - 1, by + bh - 1, color);
  // Top bar
  fillRect(px, w, bx, by, bx + bw - 1, by + thick - 1, color);
  // Bottom bar
  fillRect(px, w, bx, by + bh - thick, bx + bw - 1, by + bh - 1, color);
  // Erase right side opening to form C shape
  fillRect(px, w, bx + bw - thick, by + thick, bx + bw - 1, by + gapTop - 1, TRANSP);
  fillRect(px, w, bx + bw - thick, by + bh - gapBot, bx + bw - 1, by + bh - thick - 1, TRANSP);
}

// ---------------------------------------------------------------------------
// Icon renderers
// ---------------------------------------------------------------------------

function render16() {
  const w = 16, h = 16;
  const px = buf(w, h);
  fillRoundRect(px, w, h, 0, 0, w, h, 4, TEAL);
  // Tiny white "T" stroke (just the stem for legibility)
  const tw = 6, th = 8, tx = 5, ty = 4;
  fillRect(px, w, tx, ty, tx + tw - 1, ty + 1, WHITE);
  fillRect(px, w, tx + 2, ty + 2, tx + 3, ty + th - 1, WHITE);
  return encodePNG(w, h, px);
}

function render48() {
  const w = 48, h = 48;
  const px = buf(w, h);
  fillRoundRect(px, w, h, 0, 0, w, h, 10, DARK);
  // Teal accent bar (left edge)
  fillRect(px, w, 0, 0, 3, h - 1, TEAL);
  // White "TC"
  const glyphH = 24, glyphW = 15, gap = 4;
  const totalW = glyphW * 2 + gap;
  const startX = Math.round((w - totalW) / 2);
  const startY = Math.round((h - glyphH) / 2);
  drawT(px, w, startX, startY, glyphW, glyphH, WHITE);
  drawC(px, w, startX + glyphW + gap, startY, glyphW, glyphH, TEAL);
  return encodePNG(w, h, px);
}

function render128() {
  const w = 128, h = 128;
  const px = buf(w, h);
  // Dark background with rounded corners
  fillRoundRect(px, w, h, 0, 0, w, h, 20, DARK);
  // Teal border accent (top)
  fillRect(px, w, 20, 0, w - 20, 3, TEAL);
  // Large "TC" centered
  const glyphH = 56, glyphW = 36, gap = 10;
  const totalW = glyphW * 2 + gap;
  const startX = Math.round((w - totalW) / 2);
  const startY = Math.round((h - glyphH) / 2);
  drawT(px, w, startX, startY, glyphW, glyphH, WHITE);
  drawC(px, w, startX + glyphW + gap, startY, glyphW, glyphH, TEAL);
  // Subtle teal dot bottom-right
  fillRoundRect(px, w, h, w - 22, h - 22, 14, 14, 7, TEAL);
  return encodePNG(w, h, px);
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

const outDir = path.join(__dirname, 'src', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const icons = [
  { file: 'icon16.png',  data: render16()  },
  { file: 'icon48.png',  data: render48()  },
  { file: 'icon128.png', data: render128() },
];

for (const { file, data } of icons) {
  const out = path.join(outDir, file);
  fs.writeFileSync(out, data);
  console.log(`Generated ${file} (${data.length} bytes)`);
}

console.log('Icons generated.');
