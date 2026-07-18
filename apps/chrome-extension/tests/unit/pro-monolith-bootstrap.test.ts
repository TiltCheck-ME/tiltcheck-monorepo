/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */
/**
 * @vitest-environment jsdom
 * Pro monolith bootstrap — sidebar, extractor, license gate, injection toggle.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

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
      source: 'Current page footer scan',
      lastVerifiedAt: '2026-05-09T00:00:00.000Z',
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
      getSessionSummary = vi.fn().mockReturnValue({
        currentBalance: 100,
        startTime: Date.now(),
        totalBets: 0,
        totalWagered: 0,
        totalWon: 0,
      });
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
    buildLicensePresentation: vi.fn().mockImplementation((v) => ({
      summary: v?.warningMessage ?? 'License verified: Malta Gaming Authority',
      tone: v?.shouldAnalyze === false ? 'risk' : 'verified',
      details: ['Source: test registry', 'Last verified: test run', 'Not legal advice.'],
    })),
    getAnalysisBlockMessage: vi.fn().mockImplementation((v) =>
      v?.shouldAnalyze === false ? v.warningMessage : null
    ),
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
  vi.doMock('@tiltcheck/utils', () => ({
    SolanaProvider: class {
      getLatestBlockHash = vi.fn().mockResolvedValue('hash');
    },
  }));
  return { extractorInitialize, tiltDetectorSpy };
}

describe('pro-monolith-bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    document.head.innerHTML = '';
    document.body.innerHTML = '';

    vi.stubGlobal('chrome', {
      runtime: {
        onMessage: {
          addListener: vi.fn(),
        },
        sendMessage: vi.fn(),
      },
      storage: {
        local: {
          get: vi.fn((keys: string | string[], callback?: (value: unknown) => void) => {
            const keyList = typeof keys === 'string' ? [keys] : keys;
            const result = Object.fromEntries(keyList.map((k) => [k, null]));
            callback?.(result);
            return Promise.resolve(result);
          }),
          set: vi.fn(() => Promise.resolve()),
        },
      },
    });
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
          source: 'Current page DOM scan',
          lastVerifiedAt: '2026-05-09T00:00:00.000Z',
          warnings: [],
        },
        verdict: 'unlicensed',
        shouldAnalyze: false,
        warningMessage:
          'No valid gambling license found yet. Normal TiltCheck analysis is disabled on this site.',
      },
    });

    const { startProMonolith } = await import('../../src/pro-monolith-bootstrap.ts');
    await startProMonolith();
    await flush();

    expect(extractorInitialize).not.toHaveBeenCalled();
    expect(sidebarStub.updateLicense).toHaveBeenCalledWith(
      expect.objectContaining({
        verdict: 'unlicensed',
        shouldAnalyze: false,
      })
    );
    const mobileHud = document.getElementById('tiltcheck-mobile-license-hud');
    expect(mobileHud?.dataset.status).toBe('risk');
    expect(mobileHud?.textContent).toBe(
      'No valid gambling license found yet. Normal TiltCheck analysis is disabled on this site. | Made for Degens. By Degens.'
    );
    expect(sidebarStub.updateStatus).toHaveBeenCalledWith(
      'No valid gambling license found yet. Normal TiltCheck analysis is disabled on this site.',
      'warning'
    );
    expect(sidebarStub.updateRealityCheck).toHaveBeenCalledWith(false);
  });

  it('passes through honest zero balances without fabricating a starting amount', async () => {
    const tiltDetectorSpy = vi.fn();
    mockHeavyDependencies({ extractBalance: 0, tiltDetectorSpy });

    const { startProMonolith } = await import('../../src/pro-monolith-bootstrap.ts');
    await startProMonolith();
    await flush();

    expect(tiltDetectorSpy).toHaveBeenCalledWith(0, 'moderate', 0);
  });

  it('deactivateProMonolith removes sidebar and disconnects observers', async () => {
    mockHeavyDependencies();
    const { startProMonolith, deactivateProMonolith } = await import(
      '../../src/pro-monolith-bootstrap.ts'
    );
    await startProMonolith();
    await flush();

    expect(document.getElementById('tiltcheck-sidebar')).toBeTruthy();

    deactivateProMonolith();
    expect(document.getElementById('tiltcheck-sidebar')).toBeNull();
  });

  it.skip('honors the persisted injection off-switch until the toolbar wakes it back up', async () => {
    type Listener = (
      message: unknown,
      sender: unknown,
      sendResponse: (r: unknown) => void
    ) => boolean | void;
    const listeners: Listener[] = [];
    const storageState: Record<string, unknown> = { tiltcheck_injection_disabled: true };

    vi.stubGlobal('chrome', {
      runtime: {
        onMessage: {
          addListener: vi.fn((handler: Listener) => listeners.push(handler)),
        },
        sendMessage: vi.fn(),
      },
      storage: {
        local: {
          get: vi.fn((keys: string | string[], callback?: (value: unknown) => void) => {
            const keyList = typeof keys === 'string' ? [keys] : keys;
            const result = Object.fromEntries(keyList.map((k) => [k, storageState[k] ?? null]));
            if (callback) callback(result);
            return Promise.resolve(result);
          }),
          set: vi.fn((data: Record<string, unknown>, callback?: () => void) => {
            Object.assign(storageState, data);
            callback?.();
            return Promise.resolve();
          }),
        },
      },
    });

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

    const { startProMonolith } = await import('../../src/pro-monolith-bootstrap.ts');
    await startProMonolith();
    await flush();

    expect(initSidebar).not.toHaveBeenCalled();
    const getState = vi.fn();
    listeners[0]!({ type: 'get_sidebar_state' }, null, getState);
    expect(getState).toHaveBeenCalledWith(
      expect.objectContaining({
        exists: false,
        injectionDisabled: true,
      })
    );

    const toggle = vi.fn();
    listeners[0]!({ type: 'toggle_sidebar' }, null, toggle);

    await vi.waitFor(() => {
      expect(toggle).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          visible: true,
          injectionDisabled: false,
        })
      );
    });
    expect(storageState.tiltcheck_injection_disabled).toBe(false);
  });
});
