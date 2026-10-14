/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = dirname(fileURLToPath(import.meta.url));
const popupHtml = readFileSync(join(root, '../../src/popup.html'), 'utf8');
const popupTs = readFileSync(join(root, '../../src/popup.ts'), 'utf8');

describe('popup guest-first copy', () => {
  it('opens on Guards, not a Discord wall', () => {
    expect(popupHtml).toContain('data-tab="block">Guards');
    expect(popupHtml).toMatch(/class="tab active"[^>]*data-tab="block"/);
    expect(popupHtml).toContain('id="panel-block" class="panel active"');
    expect(popupHtml).not.toContain('id="panel-status" class="panel active"');
  });

  it('does not tell guests the sidebar is the primary interface', () => {
    expect(popupHtml).not.toContain('sidebar is the primary interface');
    expect(popupHtml).toContain('Core runs guest');
    expect(popupHtml).toContain('tiltcheck.me/cooldown');
  });

  it('lands guests on Guards after init', () => {
    expect(popupTs).toContain("activateTab(userId ? 'status' : 'block')");
    expect(popupTs).not.toContain('Open the sidebar on your casino tab to finish Discord sign-in.');
  });
});
