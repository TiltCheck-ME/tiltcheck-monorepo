/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08 */
/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type OnMessageHandler = (message: any, sender: any, sendResponse: (response: any) => void) => boolean | void;

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

function createChromeMock(initialStorage: Record<string, unknown> = {}) {
  const listeners: OnMessageHandler[] = [];
  const storageState: Record<string, unknown> = { ...initialStorage };
  const chromeMock = {
    runtime: {
      onMessage: {
        addListener: vi.fn((handler: OnMessageHandler) => listeners.push(handler)),
      },
      sendMessage: vi.fn(),
    },
    storage: {
      local: {
        get: vi.fn((keys: string[] | string, callback?: (value: any) => void) => {
          const result = Array.isArray(keys)
            ? Object.fromEntries(keys.map((k) => [k, storageState[k] ?? null]))
            : { [keys]: storageState[keys] ?? null };
          if (callback) callback(result);
          return Promise.resolve(result);
        }),
        set: vi.fn((data: any, callback?: () => void) => {
          Object.assign(storageState, data);
          callback?.();
          return Promise.resolve();
        }),
      },
    },
  };
  (globalThis as any).chrome = chromeMock;
  return { chromeMock, listeners, storageState };
}

function mockHeavyDependencies(options?: {
  extractBalance?: number | null;
  tiltDetectorSpy?: ReturnType<typeof vi.fn>;
  verification?: Record<string, unknown>;
  sidebarStub?: Record<string, ReturnType<typeof vi.fn>>;
}) {
  const extractorInitialize = vi.fn().mockResolvedValue(undefined);
  const tiltDetectorSpy = options?.tiltDetectorSpy ?? vi.fn();
  const sidebarStub = options?.sidebarStub ?? {
    updateLicense: vi.fn(),
    updateStatus: vi.fn(),
    updateRealityCheck: vi.fn(),
    addFeedMessage: vi.fn(),
    updateTilt: vi.fn(),
    updateStats: vi.fn(),
    notifyBuddy: vi.fn(),
  };
  const verification = {
    isLegitimate: true,
    licenseInfo: {
      found: true,
      issuingAuthority: 'Malta Gaming Authority',
      jurisdiction: 'Malta',
      verified: true,
      warnings: [],
    },
    verdict: 'legitimate',
    shouldAnalyze: true,
    ...options?.verification,
  };
  vi.doMock('../../src/extractor.js', () => ({
    AnalyzerClient: class {
      connect = vi.fn().mockResolvedValue(undefined);
      disconnect = vi.fn();
      sendSpin = vi.fn();
    },
    CasinoDataExtractor: class {
      initialize = extractorInitialize;
      extractBalance = vi.fn().mockReturnValue(options?.extractBalance ?? 100);
      startObserving = vi.fn().mockReturnValue(() => {});
    },
  }));
  vi.doMock('../../src/tilt-detector.js', () => ({
    TiltDetector: class {
      constructor(...args: unknown[]) {
        tiltDetectorSpy(...args);
      }
      recordBet = vi.fn();
      getSessionSummary = vi.fn().mockReturnValue({ currentBalance: 100, startTime: Date.now(), totalBets: 0, totalWagered: 0, totalWon: 0 });
      detectAllTiltSigns = vi.fn().mockReturnValue([]);
      getTiltRiskScore = vi.fn().mockReturnValue(0);
      generateInterventions = vi.fn().mockReturnValue([]);
      updateBalance = vi.fn();
    },
  }));
  vi.doMock('../../src/license-verifier.js', () => ({
    CasinoLicenseVerifier: class {
      verifyCasino = vi.fn().mockReturnValue(verification);
    },
    buildLicensePresentation: vi.fn().mockImplementation((verification) => ({
      summary: verification?.warningMessage ?? 'License verified: Malta Gaming Authority',
      tone: verification?.shouldAnalyze === false ? 'risk' : 'verified',
    })),
    getAnalysisBlockMessage: vi.fn().mockImplementation((verification) => verification?.shouldAnalyze === false ? verification.warningMessage : null),
  }));
  vi.doMock('../../src/sidebar/index.js', () => ({
    initSidebar: vi.fn(() => {
      let sidebar = document.getElementById('tiltcheck-sidebar');
      if (!sidebar) {
        sidebar = document.createElement('div');
        sidebar.id = 'tiltcheck-sidebar';
        document.body.appendChild(sidebar);
      }
      return sidebarStub;
    }),
  }));
  vi.doMock('../../src/analyzer.js', () => ({ Analyzer: class {} }));
  vi.doMock('../../src/FairnessService.js', () => ({ FairnessService: class {} }));
  vi.doMock('@tiltcheck/utils', () => ({ SolanaProvider: class { getLatestBlockHash = vi.fn().mockResolvedValue('hash'); } }));
  return { extractorInitialize, tiltDetectorSpy };
}

describe('content script readiness contracts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('registers runtime message handler and supports sidebar state/toggle', async () => {
    const { listeners } = createChromeMock();
    mockHeavyDependencies();
    (window as any).TiltCheckSidebar = {
      create: vi.fn(() => {
        const div = document.createElement('div');
        div.id = 'tiltcheck-sidebar';
        div.style.display = 'none';
        document.body.appendChild(div);
        return div;
      }),
      updateLicense: vi.fn(),
      updateGuardian: vi.fn(),
      updateStats: vi.fn(),
      updateTilt: vi.fn(),
      notifyBuddy: vi.fn(),
    };

    await import('../../src/content.ts');
    await flush();
    expect(listeners).toHaveLength(1);

    const onMessage = listeners[0];
    const getState = vi.fn();
    onMessage({ type: 'get_sidebar_state' }, null, getState);
    expect(getState).toHaveBeenCalledWith(expect.objectContaining({ exists: true }));
    const initialVisible = Boolean(getState.mock.calls[0]?.[0]?.visible);

    const toggle = vi.fn();
    onMessage({ type: 'toggle_sidebar' }, null, toggle);
    await vi.waitFor(() => {
      expect(toggle).toHaveBeenCalled();
    });
    expect(toggle).toHaveBeenCalledWith(expect.objectContaining({ success: true, visible: !initialVisible }));
  });

  it('returns explicit error for unknown runtime message type', async () => {
    const { listeners } = createChromeMock();
    mockHeavyDependencies();
    (window as any).TiltCheckSidebar = {
      create: vi.fn(() => null),
      updateLicense: vi.fn(),
      updateGuardian: vi.fn(),
      updateStats: vi.fn(),
      updateTilt: vi.fn(),
      notifyBuddy: vi.fn(),
    };
    await import('../../src/content.ts');
    await flush();

    const response = vi.fn();
    listeners[0]({ type: 'unknown_message' }, null, response);
    expect(response).toHaveBeenCalledWith({ error: 'Unknown message type' });
  });

  it('blocks auto analysis when the site is unlicensed', async () => {
    const sidebarStub = {
      syncAccountUi: vi.fn(),
      showMainContent: vi.fn(),
      addFeedMessage: vi.fn(),
      getStorage: vi.fn().mockResolvedValue({}),
      setStorage: vi.fn().mockResolvedValue(undefined),
      updateStatus: vi.fn(),
      updateRealityCheck: vi.fn(),
      updateLicense: vi.fn(),
      updateTilt: vi.fn(),
      updateStats: vi.fn(),
      notifyBuddy: vi.fn(),
      openPremium: vi.fn().mockResolvedValue(undefined),
    };
    const { extractorInitialize } = mockHeavyDependencies({
      sidebarStub,
      verification: {
        isLegitimate: false,
        licenseInfo: {
          found: false,
          verified: false,
          warnings: [],
        },
        verdict: 'unlicensed',
        shouldAnalyze: false,
        warningMessage: 'No valid gambling license found yet. Normal TiltCheck analysis is disabled on this site.',
      },
    });

    await import('../../src/content.ts');
    await flush();

    expect(extractorInitialize).not.toHaveBeenCalled();
    expect(sidebarStub.updateLicense).toHaveBeenCalledWith(expect.objectContaining({
      verdict: 'unlicensed',
      shouldAnalyze: false,
    }));
    const mobileHud = document.getElementById('tiltcheck-mobile-license-hud');
    expect(mobileHud?.dataset.status).toBe('risk');
    expect(mobileHud?.textContent).toBe('No valid gambling license found yet. Normal TiltCheck analysis is disabled on this site. | Made for Degens. By Degens.');
    expect(sidebarStub.updateStatus).toHaveBeenCalledWith(
      'No valid gambling license found yet. Normal TiltCheck analysis is disabled on this site.',
      'warning',
    );
    expect(sidebarStub.updateRealityCheck).toHaveBeenCalledWith(false);
  });

  it('passes through honest zero balances without fabricating a starting amount', async () => {
    const { listeners } = createChromeMock();
    const tiltDetectorSpy = vi.fn();
    mockHeavyDependencies({ extractBalance: 0, tiltDetectorSpy });
    (window as any).TiltCheckSidebar = {
      create: vi.fn(() => {
        const div = document.createElement('div');
        div.id = 'tiltcheck-sidebar';
        document.body.appendChild(div);
        return div;
      }),
      updateLicense: vi.fn(),
      updateGuardian: vi.fn(),
      updateStats: vi.fn(),
      updateTilt: vi.fn(),
      notifyBuddy: vi.fn(),
    };

    await import('../../src/content.ts');
    await flush();

    expect(listeners).toHaveLength(1);
    expect(tiltDetectorSpy).toHaveBeenCalledWith(0, 'moderate', 0);
  });

  it('honors the persisted injection off-switch until the toolbar wakes it back up', async () => {
    const { listeners, storageState } = createChromeMock({ tiltcheck_injection_disabled: true });
    const sidebarStub = {
      syncAccountUi: vi.fn(),
      showMainContent: vi.fn(),
      addFeedMessage: vi.fn(),
      getStorage: vi.fn().mockResolvedValue({}),
      setStorage: vi.fn().mockResolvedValue(undefined),
      updateStatus: vi.fn(),
      updateRealityCheck: vi.fn(),
      updateLicense: vi.fn(),
      updateTilt: vi.fn(),
      updateStats: vi.fn(),
      notifyBuddy: vi.fn(),
      openPremium: vi.fn().mockResolvedValue(undefined),
    };
    const initSidebar = vi.fn(() => sidebarStub);
    vi.doMock('../../src/sidebar/index.js', () => ({ initSidebar }));
    mockHeavyDependencies();

    await import('../../src/content.ts');
    await flush();

    expect(initSidebar).not.toHaveBeenCalled();
    const getState = vi.fn();
    listeners[0]({ type: 'get_sidebar_state' }, null, getState);
    expect(getState).toHaveBeenCalledWith(expect.objectContaining({
      exists: false,
      injectionDisabled: true,
    }));

    const toggle = vi.fn();
    listeners[0]({ type: 'toggle_sidebar' }, null, toggle);

    await vi.waitFor(() => {
      expect(toggle).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        visible: true,
        injectionDisabled: false,
      }));
    });
    expect(storageState.tiltcheck_injection_disabled).toBe(false);
    // Runtime may attach the sidebar via `initialize()` after force-enable; do not require the mocked `initSidebar` hook.
  });
});
