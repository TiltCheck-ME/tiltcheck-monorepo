/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13 */
/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyBackendAvailability } from '../../src/backend-availability.ts';
import { postRoundTelemetry, postWinSecureTelemetry } from '../../src/telemetry-client.ts';
import { GameBlocker } from '../../src/game-blocker.ts';
import { installLoungeOverlay } from '../../src/lounge-overlay.ts';

const popupFragment = `
  <button class="tab" data-tab="vault">Vault</button>
  <div id="tilt-block"></div>
  <div id="stat-cell-pl"></div>
  <div id="stat-cell-blocked"></div>
  <p id="server-exclusions-off" style="display:none"></p>
  <div id="server-exclusions"></div>
  <div id="vault-stat-row"></div>
  <p id="vault-rules-off" style="display:none"></p>
  <div id="vault-rules-section"></div>
`;

describe('features without a backend', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('hides server-only popup sections and shows the plain notes', () => {
    document.body.innerHTML = popupFragment;
    applyBackendAvailability(document);

    for (const id of ['tilt-block', 'stat-cell-pl', 'stat-cell-blocked', 'server-exclusions', 'vault-stat-row', 'vault-rules-section']) {
      expect(document.getElementById(id)!.style.display, id).toBe('none');
    }
    expect(document.getElementById('server-exclusions-off')!.style.display).toBe('');
    expect(document.getElementById('vault-rules-off')!.style.display).toBe('');
    expect(document.querySelector<HTMLElement>('.tab[data-tab="vault"]')!.style.display).toBe('none');
  });

  it('does not touch the network for telemetry', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(postRoundTelemetry({ userId: 'u', bet: 1, win: 0 })).resolves.toBeNull();
    await expect(postWinSecureTelemetry({ userId: 'u', amount: 5 })).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not fetch synced exclusions', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const blocker = new GameBlocker('discord-1', 'token-1');
    await blocker.init();
    expect(fetchMock).not.toHaveBeenCalled();
    blocker.destroy();
  });

  it('does not show the lounge panel or poll for it', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const teardown = installLoungeOverlay(document);
    expect(document.getElementById('tiltcheck-lounge-host')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    teardown();
  });
});
