// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const dir = path.dirname(fileURLToPath(import.meta.url));
const page = readFileSync(path.join(dir, 'page.tsx'), 'utf8');

describe('touch-grass trivia page source', () => {
  it('embeds TriviaPractice and skips crisis/pay rails', () => {
    expect(page).toContain('TriviaPractice');
    expect(page).not.toContain('1-800-GAMBLER');
    expect(page).not.toContain('/pay/jackpot');
  });
});
