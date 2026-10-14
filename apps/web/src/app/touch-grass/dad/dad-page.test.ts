// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const dir = path.dirname(fileURLToPath(import.meta.url));
const page = readFileSync(path.join(dir, 'page.tsx'), 'utf8');
const practice = readFileSync(
  path.resolve(dir, '../../../components/touch-grass/DadPractice.tsx'),
  'utf8',
);
const source = `${page}\n${practice}`;

describe('touch-grass dad page source', () => {
  it('embeds an honest Discord outbound and skips crisis/pay rails', () => {
    expect(source).toContain('Open in Discord');
    expect(source).toContain('DISCORD_INVITE_URL');
    expect(source).toContain('TOUCH_GRASS_HUB.dadDiscordOnly');
    expect(source).not.toContain('1-800-GAMBLER');
    expect(source).not.toContain('/pay/jackpot');
    expect(source).not.toContain('jackpot');
    expect(source).not.toContain('treasury');
    expect(source).not.toMatch(/WebSocket|socket\.io/i);
  });
});
