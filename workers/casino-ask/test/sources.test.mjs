// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CATALOG, OFFICIAL_PAGES, auditText, findCasinos, slugify } from '../src/sources.js';

test('catalog: Acebet with its own pages, plus every audited casino from casinos.json', () => {
  const acebet = CATALOG.find((c) => c.slug === 'acebet');
  assert.ok(acebet && acebet.pages.length === 4);
  for (const p of acebet.pages) assert.match(p.url, /^https:\/\/acebet\.cc\//);
  assert.ok(CATALOG.filter((c) => c.audit).length >= 30);
});

test('official pages are https on the casino domain', () => {
  for (const o of OFFICIAL_PAGES) for (const p of o.pages) assert.match(p.url, /^https:\/\/[a-z0-9.-]+\//);
});

test('findCasinos matches names on word boundaries', () => {
  assert.deepEqual(findCasinos('How long does Acebet take for freeze card redemption?').map((c) => c.name), ['Acebet']);
  assert.deepEqual(findCasinos("acebet's redemption minimum").map((c) => c.name), ['Acebet']);
  assert.deepEqual(findCasinos('is ace.com legit').map((c) => c.name), []);
  assert.deepEqual(findCasinos('chumba payout time').map((c) => c.name), ['Chumba Casino']);
  assert.deepEqual(findCasinos('stake.us redemption').map((c) => c.name), ['Stake.us']);
  assert.equal(findCasinos('stake withdrawals').length, 2);
  assert.deepEqual(findCasinos('what about bovada'), []);
});

test('auditText only states fields that exist', () => {
  const t = auditText({ name: 'X', grade: 'B', risk: 'Low', category: 'Sweeps', redemptionMinHours: 24, redemptionMaxHours: 72, evidence: ['One.'] });
  assert.match(t, /24 to 72 hours/);
  assert.doesNotMatch(auditText({ name: 'Y', grade: 'C' }), /hours/);
  assert.equal(slugify('Stake.us'), 'stake-us');
});
