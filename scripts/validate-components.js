#!/usr/bin/env node
/*
 Minimal DOM snapshot + structure checks for components.
 - Parses HTML with JSDOM
 - Validates required roles/ids
 - Compares snapshots for select pages

 Usage:
   node scripts/validate-components.js
 To update snapshots:
   UPDATE_SNAPSHOTS=true node scripts/validate-components.js
*/
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'services', 'dashboard', 'public', 'components');
const SNAP_DIR = path.join(ROOT, 'tests', 'snapshots');

function readHtml(filePath){
  const html = fs.readFileSync(filePath, 'utf8');
  const dom = new JSDOM(html);
  return dom.window.document;
}

function ensureDir(dir){
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeSnapshot(name, data){
  ensureDir(SNAP_DIR);
  fs.writeFileSync(path.join(SNAP_DIR, name), JSON.stringify(data, null, 2) + '\n');
}

function readSnapshot(name){
  const p = path.join(SNAP_DIR, name);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function assertEqual(actual, expected, msg){
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e){
    throw new Error(`${msg}\nExpected: ${e}\nActual:   ${a}`);
  }
}

function checkBasicParse(doc, fname){
  if (!doc.documentElement || !doc.querySelector('body')){
    throw new Error(`Failed to parse HTML structure in ${fname}`);
  }
}

function ecosystemSnapshot(doc){
  const cards = Array.from(doc.querySelectorAll('.cards [role="listitem"] > h3'))
    .map(h => h.textContent.trim());
  return { cards };
}

function degenEngineSnapshot(doc){
  const ids = ['trustVal','trustBadge','tiltFill','behFill','accFill'];
  const missing = ids.filter(id => !doc.getElementById(id));
  if (missing.length){
    throw new Error(`degen-trust-engine missing required ids: ${missing.join(', ')}`);
  }
  const levels = Array.from(doc.querySelectorAll('.levels .lvl .lvl-name'))
    .map(n => n.textContent.trim());
  return { levels };
}

function trustPanelSnapshot(doc){
  const metrics = Array.from(doc.querySelectorAll('.metric-label'))
    .map(m => m.textContent.trim());
  return { metrics };
}

function transparencyHeroSnapshot(doc){
  const guarantees = Array.from(doc.querySelectorAll('li strong'))
    .map(g => g.textContent.trim());
  return { guarantees };
}

function run(){
  const update = process.env.UPDATE_SNAPSHOTS === 'true';
  const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.html'));

  let passed = 0;
  for (const f of files){
    const full = path.join(SRC_DIR, f);
    const doc = readHtml(full);
    checkBasicParse(doc, f);

    if (f === 'ecosystem.html'){
      const snap = ecosystemSnapshot(doc);
      if (update){
        writeSnapshot('ecosystem.cards.json', snap);
      } else {
        const expected = readSnapshot('ecosystem.cards.json');
        if (!expected) throw new Error('Missing snapshot: tests/snapshots/ecosystem.cards.json');
        assertEqual(snap, expected, 'Ecosystem cards snapshot mismatch');
      }
    }

    if (f === 'degen-trust-engine.html'){
      const snap = degenEngineSnapshot(doc);
      if (update){
        writeSnapshot('degen-trust-engine.levels.json', snap);
      } else {
        const expected = readSnapshot('degen-trust-engine.levels.json');
        if (!expected) throw new Error('Missing snapshot: tests/snapshots/degen-trust-engine.levels.json');
        assertEqual(snap, expected, 'Degen Trust Engine levels snapshot mismatch');
      }
    }

    if (f === 'trust-panel.html'){
      const snap = trustPanelSnapshot(doc);
      if (update){
        writeSnapshot('trust-panel.metrics.json', snap);
      } else {
        const expected = readSnapshot('trust-panel.metrics.json');
        if (!expected) throw new Error('Missing snapshot: tests/snapshots/trust-panel.metrics.json');
        assertEqual(snap, expected, 'Trust Panel metrics snapshot mismatch');
      }
    }

    if (f === 'transparency-hero.html'){
      const snap = transparencyHeroSnapshot(doc);
      if (update){
        writeSnapshot('transparency-hero.guarantees.json', snap);
      } else {
        const expected = readSnapshot('transparency-hero.guarantees.json');
        if (!expected) throw new Error('Missing snapshot: tests/snapshots/transparency-hero.guarantees.json');
        assertEqual(snap, expected, 'Transparency Hero guarantees snapshot mismatch');
      }
    }

    passed++;
  }
  console.log(`[components-validate] Parsed ${passed} component files successfully.`);
}

run();
