/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04 */
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

  it('does not include the placebo Core sensitivity slider (EXT-5)', () => {
    expect(popupHtml).not.toContain('id="slider-controls"');
    expect(popupHtml).not.toContain('id="risk-threshold-slider"');
    expect(popupHtml).not.toContain('<span>Sensitivity</span>');
  });

  it('signposts GAMSTOP and NCPG next to browser filters (RG-1)', () => {
    expect(popupHtml).toContain('class="rg-signpost"');
    expect(popupHtml).toContain('ncpgambling.org');
    expect(popupHtml).toContain('1-800-GAMBLER');
    expect(popupHtml).toContain('gamstop.co.uk');
  });

  it('renders Session Velocity Radar card and wires popup updates', () => {
    expect(popupHtml).toContain('id="session-radar-card"');
    expect(popupHtml).toContain('id="radar-sparkline-wrap"');
    expect(popupHtml).toContain('id="radar-badge"');
    expect(popupHtml).toContain('id="radar-velocity-val"');
    expect(popupHtml).toContain('id="btn-reset-radar"');

    expect(popupTs).toContain('generateSparklineSvg');
    expect(popupTs).toContain('determineVelocityStatus');
    expect(popupTs).toContain('loadSessionRadar');
    expect(popupTs).toContain('updateSessionRadarUI');
  });
});
