#!/usr/bin/env node
/**
 * Extended contrast audit using jsdom to parse actual component HTML files.
 * Approximates computed foreground/background colors by resolving CSS variables and simple class rules.
 * This is intentionally lightweight (no full CSS cascade) for our static fragments.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const componentDir = path.join(__dirname, '..', 'services', 'dashboard', 'public', 'components');
const files = ['trust-panel.html', 'logo.html', 'transparency-hero.html', 'index.html'];

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

function parseCssVariables(styleText) {
  const vars = {};
  const rootMatch = /:root\s*{([^}]*)}/.exec(styleText);
  if (rootMatch) {
    rootMatch[1].split(';').forEach(decl => {
      const [prop, val] = decl.split(':').map(s => s && s.trim());
      if (prop && val && prop.startsWith('--')) vars[prop] = val;
    });
  }
  return vars;
}

function substituteVars(value, vars) {
  if (!value) return value;
  return value.replace(/var\((--[^)]+)\)/g, (_, vName) => vars[vName] || value);
}

function extractClassColors(styleText) {
  const map = {}; // class -> color
  const regex = /\.([a-zA-Z0-9_-]+)\s*{[^}]*color:\s*([^;]+);[^}]*}/g;
  let m;
  while ((m = regex.exec(styleText))) {
    map[m[1]] = m[2].trim();
  }
  return map;
}

const results = [];
const failures = [];

for (const file of files) {
  const full = path.join(componentDir, file);
  if (!fs.existsSync(full)) continue;
  const html = fs.readFileSync(full, 'utf8');
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const styleEl = document.querySelector('style');
  const styleText = styleEl ? styleEl.textContent : '';
  const vars = parseCssVariables(styleText);
  const classColors = extractClassColors(styleText);

  // Derive body background (fallback #0f0f0f)
  const bodyBg = substituteVars(vars['--bg'] || '#0f0f0f', vars);
  const defaultText = substituteVars(vars['--text'] || '#ffffff', vars);

  // Collect candidate elements: headings, paragraphs, labels, .fact strong, links, .disclaimer
  const candidates = Array.from(document.querySelectorAll('h1,h2,h3,h4,p,span,label,div.support,div.fact,strong,a,.disclaimer'));

  for (const el of candidates) {
    // Resolve foreground color
    let fg = el.style.color || null;
    if (!fg) {
      // Try classes
      for (const cls of el.classList) {
        if (classColors[cls]) { fg = classColors[cls]; break; }
      }
    }
    if (!fg) fg = defaultText;
    fg = substituteVars(fg, vars).trim();

    // Quick skip for gradient/text-clip cases
    if (fg === 'transparent' || fg.startsWith('linear-gradient')) continue;

    // Resolve background upward (check self then parents)
    let bg = null;
    let cur = el;
    while (cur && cur !== document.documentElement) {
      const inlineBg = cur.style && cur.style.background;
      if (inlineBg && inlineBg.startsWith('#')) { bg = inlineBg; break; }
      cur = cur.parentElement;
    }
    if (!bg) bg = bodyBg;

    // Normalize hex (remove potential extra tokens)
    const fgHex = fg.match(/#[0-9a-fA-F]{6}/) ? fg.match(/#[0-9a-fA-F]{6}/)[0] : null;
    const bgHex = bg.match(/#[0-9a-fA-F]{6}/) ? bg.match(/#[0-9a-fA-F]{6}/)[0] : '#0f0f0f';
    if (!fgHex) continue;

    const ratio = contrastRatio(fgHex, bgHex);
    const isHeading = /^H[1-4]$/.test(el.tagName);
    const min = isHeading ? 3.0 : 4.5; // treat headings as large text
    const pass = ratio >= min;
    const descriptor = `${file}:${el.tagName}${el.id ? '#' + el.id : ''}${el.className ? '.' + [...el.classList].join('.') : ''}`;
    results.push({ descriptor, ratio: ratio.toFixed(2), min, pass, fg: fgHex, bg: bgHex });
    if (!pass) failures.push({ descriptor, ratio: ratio.toFixed(2), min, fg: fgHex, bg: bgHex });
  }
}

console.log('\nTiltCheck DOM Contrast Audit');
console.log([ 'Element', 'Ratio', 'Req', 'FG', 'BG', 'Pass' ].join(' | '));
console.log('-'.repeat(70));
for (const r of results) {
  console.log([ r.descriptor, r.ratio, r.min, r.fg, r.bg, r.pass ? '✓' : '✗' ].join(' | '));
}
if (failures.length) {
  console.error('\nFailures:');
  failures.forEach(f => console.error(`  ${f.descriptor} ratio ${f.ratio} < ${f.min} (fg ${f.fg} bg ${f.bg})`));
  process.exitCode = 1;
} else {
  console.log('\nAll elements meet contrast thresholds.');
}
