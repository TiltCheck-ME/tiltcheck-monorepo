// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18
// The Ask box on tiltcheck.me/casinos/ (scripts/convert-markdown.js + scripts/pages-product-data.mjs).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CASINO_ASK, PAYOUT_SPEED } from '../../../scripts/pages-product-data.mjs';

const root = new URL('../../../', import.meta.url);
const builder = readFileSync(new URL('scripts/convert-markdown.js', root), 'utf8');
const css = readFileSync(new URL('scripts/pages-assets/styles/base.css', root), 'utf8');
const workerSrc = ['answer.js', 'discord.js', 'index.js'].map((f) => readFileSync(new URL(`workers/casino-ask/src/${f}`, root), 'utf8')).join('\n');

test('Casinos page has the Ask form posting to the worker', () => {
  assert.match(CASINO_ASK.endpoint, /^https:\/\/tiltcheck-casino-ask\.[a-z0-9-]+\.workers\.dev\/ask$/);
  assert.match(builder, /\$\{buildCasinoAsk\(\)\}/);
  assert.match(builder, /id="casino-ask-form" data-endpoint=/);
  assert.match(builder, /aria-live="polite"/);
  assert.match(builder, /\$\{CASINO_ASK_SCRIPT\}/);
  // Answers are written with textContent and links are https only.
  assert.match(builder, /x\.protocol === 'https:'/);
  assert.doesNotMatch(builder.slice(builder.indexOf('const CASINO_ASK_SCRIPT'), builder.indexOf('function buildCasinosPage')), /innerHTML/);
});

test('phone first: 48px input, button and links, 16px input text', () => {
  for (const sel of ['.casino-ask__input', '.casino-ask__btn', '.casino-ask__link']) {
    const block = css.slice(css.indexOf(`${sel} {`), css.indexOf('}', css.indexOf(`${sel} {`)));
    assert.match(block, /min-height: 48px/, sel);
  }
  assert.match(css.slice(css.indexOf('.casino-ask__input {')), /font-size: 16px/);
});

test('copy: plain, no exclamation marks, TiltCheck spelled right, no shield framing', () => {
  const copy = Object.values(CASINO_ASK).join(' ');
  const userFacing = [copy, ...workerSrc.match(/'[^'\n]*'|`[^`\n]*`|"[^"\n]*"/g)].join(' ');
  assert.doesNotMatch(copy, /!/);
  assert.doesNotMatch(userFacing, /\b(shield|armou?ry|guard(ian)?|protect(ion|s)?)\b/i);
  assert.doesNotMatch(userFacing, /Tilt Check|Tiltcheck|TILTCHECK/);
  assert.match(copy, /I don't know/);
});

test('Casinos page has the RotoWire payout-speed table, credited and dated', () => {
  assert.match(builder, /\$\{buildPayoutSpeed\(\)\}/);
  assert.match(builder, /id="payout-speed"/);
  assert.match(builder, /data\/trust-engine\/operator-facts\.live\.json/);
  assert.match(builder, /Source: \$\{credit\}\. As of /);
  const copy = Object.values(PAYOUT_SPEED).flat().join(' ');
  assert.doesNotMatch(copy, /!/);
  assert.doesNotMatch(copy, /\b(fastest|best|top)\b/i, 'no ranking claims in the section copy');
  assert.match(copy, /RotoWire/);
  assert.match(copy, /not TiltCheck tests/);
});
