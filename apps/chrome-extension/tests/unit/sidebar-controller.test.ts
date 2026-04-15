/* Copyright (c) 2026 TiltCheck. All rights reserved. */
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-14
/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/sidebar/auth.js', () => ({
  AuthManager: class {
    public isConnecting = false;
    public demoMode = true;
    public authToken = null;
    public userData = null;
    constructor() {}
    restoreAuth() {}
    startDiscordLoginFlow() {}
    continueAsGuest() {}
    logout() {}
  },
}));

vi.mock('../../src/sidebar/session.js', () => ({
  SessionManager: class {
    constructor() {}
  },
}));

vi.mock('../../src/sidebar/vault.js', () => ({
  VaultManager: class {
    constructor() {}
    init() {}
    lockTheBag() {}
    toggleAutoVault() {}
    setAutoVaultPct() {}
  },
}));

vi.mock('../../src/sidebar/reports.js', () => ({
  ReportManager: class {
    constructor() {}
    submitReport() {}
    fetchRecentSignals() {}
  },
}));

vi.mock('../../src/sidebar/blockchain.js', () => ({
  BlockchainManager: class {
    constructor() {}
    setWallet() {}
  },
}));

vi.mock('../../src/sidebar/buddy.js', () => ({
  BuddyManager: class {
    constructor() {}
    restorePrefs() {}
    setMirrorEnabled() {}
    notifyMonitor() {}
    notifyIntervention() {}
  },
}));

vi.mock('../../src/sidebar/predictor.js', () => ({
  PredictorManager: class {
    constructor() {}
    init() {}
    destroy() {}
  },
}));

vi.mock('../../src/sidebar/onboarding.js', () => ({
  OnboardingManager: class {
    constructor() {}
    startIntro() {}
    next() {}
    finish() {}
  },
}));

vi.mock('../../src/sidebar/bonuses.js', () => ({
  BonusManager: class {
    constructor() {}
    init() {}
  },
}));

describe('SidebarController', () => {
  beforeEach(() => {
    vi.resetModules();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('style');
    document.body.className = '';
    document.body.innerHTML = '';
    document.body.removeAttribute('style');

    (globalThis as any).chrome = {
      storage: {
        local: {
          get: vi.fn((_keys: string[], callback: (value: Record<string, unknown>) => void) => callback({})),
          set: vi.fn((_value: Record<string, unknown>, callback?: () => void) => callback?.()),
        },
      },
      tabs: {
        create: vi.fn(),
      },
    };
  });

  it('minimizes and hides while syncing reserved page width', async () => {
    const { initSidebar } = await import('../../src/sidebar/index.ts');
    initSidebar();

    const sidebar = document.getElementById('tiltcheck-sidebar');
    expect(sidebar).toBeTruthy();
    expect(document.body.classList.contains('tiltcheck-sidebar-reserved')).toBe(true);
    expect(document.body.style.getPropertyValue('--tiltcheck-sidebar-offset')).toBe('340px');

    document.getElementById('tg-minimize')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(sidebar?.classList.contains('minimized')).toBe(true);
    expect(document.body.style.getPropertyValue('--tiltcheck-sidebar-offset')).toBe('40px');

    document.getElementById('tg-hide')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(sidebar?.style.display).toBe('none');
    expect(document.body.classList.contains('tiltcheck-sidebar-reserved')).toBe(false);
    expect(document.body.style.getPropertyValue('--tiltcheck-sidebar-offset')).toBe('0px');
  });
});
