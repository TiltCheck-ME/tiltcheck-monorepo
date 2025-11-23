#!/usr/bin/env node
/**
 * Simple accessibility contrast audit for TiltCheck component library.
 * Checks defined foreground colors against key dark backgrounds.
 * Exits non-zero if any ratio fails WCAG AA (4.5:1 for normal, 3:1 for large accent headings).
 */

const backgrounds = [
  { name: 'bg', hex: '#0f0f0f' },
  { name: 'surface', hex: '#141414' },
  { name: 'surface-alt', hex: '#181818' }
];

// Colors used for text across components.
const textColors = [
  { name: 'text-primary', hex: '#ffffff', min: 4.5 },
  { name: 'text-muted', hex: '#9aa9aa', min: 4.5 }, // approximated #9aa
  { name: 'text-contrast-mid', hex: '#c9d2d2', min: 4.5 },
  { name: 'text-low', hex: '#888888', min: 4.5 },
  { name: 'accent', hex: '#00d4aa', min: 3.0 }, // headings / large
  { name: 'accent-alt', hex: '#00a8ff', min: 3.0 }
];

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function relLuminance([r, g, b]) {
  const srgb = [r, g, b].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}
function contrastRatio(fgHex, bgHex) {
  const L1 = relLuminance(hexToRgb(fgHex));
  const L2 = relLuminance(hexToRgb(bgHex));
  const lighter = Math.max(L1, L2), darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

let failures = [];
const rows = [];
for (const bg of backgrounds) {
  for (const fg of textColors) {
    const ratio = contrastRatio(fg.hex, bg.hex);
    const pass = ratio >= fg.min;
    rows.push({ bg: bg.name, fg: fg.name, ratio: ratio.toFixed(2), min: fg.min, pass });
    if (!pass) failures.push({ bg: bg.name, fg: fg.name, ratio: ratio.toFixed(2), required: fg.min });
  }
}

function pad(str, len) { return (str + '').padEnd(len); }
console.log('\nTiltCheck Component Contrast Audit');
console.log('WCAG AA thresholds: normal 4.5, large 3.0 (accents).');
console.log('\n' + [pad('BG',10), pad('FG',15), pad('Ratio',7), pad('Req',5), 'Pass'].join(' | '));
console.log('-'.repeat(50));
for (const r of rows) {
  console.log([pad(r.bg,10), pad(r.fg,15), pad(r.ratio,7), pad(r.min,5), r.pass ? '✓' : '✗'].join(' | '));
}

if (failures.length) {
  console.error('\nContrast failures:');
  failures.forEach(f => console.error(`  ${f.fg} vs ${f.bg}: ratio ${f.ratio} < required ${f.required}`));
  process.exitCode = 1;
} else {
  console.log('\nAll checked color pairs meet specified thresholds.');
}
