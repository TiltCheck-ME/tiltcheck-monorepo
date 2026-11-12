// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Guard: the Activity has no money mechanics and no crisis copy in the main UI.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROMPTS, WHITE_CARDS } from '../src/shared/deck.js';

const root = new URL('..', import.meta.url).pathname;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

const BANNED = [/jackpot/i, /\bSOL\b/, /\brain\b/i, /\btips?\b/i, /wallet/i, /casino/i, /purchase/i, /\bprizes?\b/i, /\bbuy\b/i, /\$\d/, /1-800-GAMBLER/i, /\bpayout/i, /\bcash prize/i];

describe('no money anywhere', () => {
  it('client source and copy have no money words', () => {
    const src = files(join(root, 'src/client')).filter((f) => /\.(ts|css)$/.test(f));
    src.push(join(root, 'index.html'));
    for (const f of src) {
      const text = readFileSync(f, 'utf8');
      for (const re of BANNED) expect({ f, hit: re.test(text) ? re.source : null }).toEqual({ f, hit: null });
    }
  });

  it('every card is clean', () => {
    for (const c of [...PROMPTS, ...WHITE_CARDS]) for (const re of BANNED) expect({ c, hit: re.test(c) }).toEqual({ c, hit: false });
  });

  it('deck is big enough for a full 8-player table', () => {
    expect(WHITE_CARDS.length).toBeGreaterThanOrEqual(8 * 7 + 8);
    expect(new Set(WHITE_CARDS).size).toBe(WHITE_CARDS.length);
    expect(PROMPTS.every((p) => p.includes('_____'))).toBe(true);
  });
});
