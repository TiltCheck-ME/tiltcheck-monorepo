/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */
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

  it('renders legitimate license verdicts without the old malicious fallback', async () => {
    const { initSidebar } = await import('../../src/sidebar/index.ts');
    const controller = initSidebar();

    controller.updateLicense({
      isLegitimate: true,
      licenseInfo: {
        found: true,
        issuingAuthority: 'Malta Gaming Authority',
        jurisdiction: 'Malta',
        licenseNumber: 'MGA/B2C/1234',
        location: 'footer',
        verified: true,
        warnings: [],
      },
      verdict: 'legitimate',
      shouldAnalyze: true,
    });

    const strip = document.getElementById('tg-license-strip');
    expect(strip?.className).toBe('tg-license-strip verified');
    expect(strip?.textContent).toContain('License verified: Malta Gaming Authority');
    expect(strip?.textContent).toContain('MGA/B2C/1234');
  });

  it('shows a risk strip and styled status when analysis is gated', async () => {
    const { initSidebar } = await import('../../src/sidebar/index.ts');
    const controller = initSidebar();

    controller.updateLicense({
      isLegitimate: false,
      licenseInfo: {
        found: false,
        verified: false,
        warnings: [],
      },
      verdict: 'unlicensed',
      shouldAnalyze: false,
      warningMessage: 'No valid gambling license found yet. Normal TiltCheck analysis is disabled on this site.',
    });
    controller.updateStatus('Analysis disabled on this site.', 'warning');

    const strip = document.getElementById('tg-license-strip');
    const statusBar = document.getElementById('tg-status-bar');
    expect(strip?.className).toBe('tg-license-strip risk');
    expect(strip?.textContent).toBe('No valid gambling license found yet. Normal TiltCheck analysis is disabled on this site.');
    expect(statusBar?.className).toBe('tg-status-bar warning');
  });

  it('renders connected account state from normalized walletAddress auth data', async () => {
    const { initSidebar } = await import('../../src/sidebar/index.ts');
    const controller = initSidebar();

    controller.auth.demoMode = false;
    controller.auth.authToken = 'jwt-token';
    controller.auth.userData = {
      id: 'user_1',
      username: 'wallet-user',
      walletAddress: 'Wallet111111111111111111111111111111111',
    };

    controller.syncAccountUi();

    expect(document.getElementById('tg-account-text')?.textContent).toContain('Connected as wallet-user');
    expect(document.getElementById('tg-username')?.textContent).toBe('wallet-user');
    expect((document.getElementById('tg-connect-discord-inline') as HTMLButtonElement | null)?.hidden).toBe(true);
  });
});
