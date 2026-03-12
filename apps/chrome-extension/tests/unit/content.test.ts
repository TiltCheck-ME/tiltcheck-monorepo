/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type OnMessageHandler = (message: any, sender: any, sendResponse: (response: any) => void) => boolean | void;

function createChromeMock() {
  const listeners: OnMessageHandler[] = [];
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
            ? Object.fromEntries(keys.map((k) => [k, null]))
            : { [keys]: null };
          if (callback) callback(result);
          return Promise.resolve(result);
        }),
        set: vi.fn((_data: any, callback?: () => void) => callback?.()),
      },
    },
  };
  (globalThis as any).chrome = chromeMock;
  return { listeners };
}

function mockHeavyDependencies() {
  vi.doMock('../../src/extractor.js', () => ({
    AnalyzerClient: class {
      connect = vi.fn().mockResolvedValue(undefined);
      disconnect = vi.fn();
      sendSpin = vi.fn();
    },
    CasinoDataExtractor: class {
      initialize = vi.fn().mockResolvedValue(undefined);
      extractBalance = vi.fn().mockReturnValue(100);
      startObserving = vi.fn().mockReturnValue(() => {});
    },
  }));
  vi.doMock('../../src/tilt-detector.js', () => ({
    TiltDetector: class {
      recordBet = vi.fn();
      getSessionSummary = vi.fn().mockReturnValue({ currentBalance: 100, startTime: Date.now(), totalBets: 0, totalWagered: 0, totalWon: 0 });
      detectAllTiltSigns = vi.fn().mockReturnValue([]);
      getTiltRiskScore = vi.fn().mockReturnValue(0);
      generateInterventions = vi.fn().mockReturnValue([]);
    },
  }));
  vi.doMock('../../src/license-verifier.js', () => ({
    CasinoLicenseVerifier: class {
      verifyCasino = vi.fn().mockReturnValue({ verified: true });
    },
  }));
  vi.doMock('../../src/sidebar.js', () => ({}));
  vi.doMock('../../src/analyzer.js', () => ({ Analyzer: class {} }));
  vi.doMock('../../src/FairnessService.js', () => ({ FairnessService: class {} }));
  vi.doMock('@tiltcheck/utils', () => ({ SolanaProvider: class { getLatestBlockHash = vi.fn().mockResolvedValue('hash'); } }));
}

describe('content script readiness contracts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
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
    expect(listeners).toHaveLength(1);

    const onMessage = listeners[0];
    const getState = vi.fn();
    onMessage({ type: 'get_sidebar_state' }, null, getState);
    expect(getState).toHaveBeenCalledWith(expect.objectContaining({ exists: true }));
    const initialVisible = Boolean(getState.mock.calls[0]?.[0]?.visible);

    const toggle = vi.fn();
    onMessage({ type: 'toggle_sidebar' }, null, toggle);
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

    const response = vi.fn();
    listeners[0]({ type: 'unknown_message' }, null, response);
    expect(response).toHaveBeenCalledWith({ error: 'Unknown message type' });
  });
});
