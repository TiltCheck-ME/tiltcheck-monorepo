/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09 */
/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

type OnMessageHandler = (message: any, sender: any, sendResponse: (response: any) => void) => boolean | void;

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

function postedPayloads(spy: ReturnType<typeof vi.spyOn>): any[] {
  return spy.mock.calls.map(([payload]) => payload);
}

function createChromeMock() {
  const listeners: OnMessageHandler[] = [];

  const chromeMock = {
    runtime: {
      lastError: null as { message: string } | null,
      onMessage: {
        addListener: vi.fn((handler: OnMessageHandler) => {
          listeners.push(handler);
        }),
      },
      sendMessage: vi.fn(),
    },
    tabs: {
      query: vi.fn((_queryInfo: any, callback: (tabs: Array<{ id?: number }>) => void) => {
        callback([{ id: 101 }]);
      }),
      sendMessage: vi.fn((tabId: number, message: any, callback: (response: any) => void) => {
        if (message.type === 'get_sidebar_state') {
          callback({ exists: true, visible: false });
          return;
        }
        if (message.type === 'toggle_sidebar') {
          callback({ success: true, visible: true });
          return;
        }
        callback({ error: `Unhandled message type for tab ${tabId}` });
      }),
      create: vi.fn(),
    },
    storage: {
      local: {
        get: vi.fn((keys: string[] | string, callback?: (value: any) => void) => {
          const result = Array.isArray(keys)
            ? Object.fromEntries(keys.map((k) => [k, null]))
            : { [keys]: null };
          if (callback) {
            callback(result);
            return;
          }
          return Promise.resolve(result);
        }),
        set: vi.fn((data: any, callback?: () => void) => {
          if (callback) callback();
        }),
      },
    },
  };

  (globalThis as any).chrome = chromeMock;
  return { chromeMock, listeners };
}

function mockContentDependencies() {
  vi.doMock('../../src/extractor.js', () => {
    class MockAnalyzerClient {
      connect = vi.fn().mockResolvedValue(undefined);
      disconnect = vi.fn();
      sendSpin = vi.fn();
      constructor(_url: string) {}
    }

    class MockCasinoDataExtractor {
      initialize = vi.fn().mockResolvedValue(undefined);
      extractBalance = vi.fn().mockReturnValue(100);
      startObserving = vi.fn().mockReturnValue(() => {});
    }

    return {
      AnalyzerClient: MockAnalyzerClient,
      CasinoDataExtractor: MockCasinoDataExtractor,
    };
  });

  vi.doMock('../../src/tilt-detector.js', () => {
    class MockTiltDetector {
      constructor(_initialBalance: number, _riskLevel: string) {}
      recordBet = vi.fn();
      getSessionSummary = vi.fn().mockReturnValue({
        startTime: Date.now(),
        totalBets: 0,
        totalWagered: 0,
        totalWon: 0,
        currentBalance: 100,
      });
      detectAllTiltSigns = vi.fn().mockReturnValue([]);
      getTiltRiskScore = vi.fn().mockReturnValue(0);
      generateInterventions = vi.fn().mockReturnValue([]);
    }
    return { TiltDetector: MockTiltDetector };
  });

  vi.doMock('../../src/license-verifier.js', () => {
    class MockCasinoLicenseVerifier {
      verifyCasino = vi.fn().mockReturnValue({
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
      });
    }
    return {
      CasinoLicenseVerifier: MockCasinoLicenseVerifier,
      buildLicensePresentation: vi.fn().mockImplementation((verification) => ({
        summary: verification?.warningMessage ?? 'License verified: Malta Gaming Authority',
        tone: verification?.shouldAnalyze === false ? 'risk' : 'verified',
        details: ['Source: test registry', 'Last verified: test run', 'Not legal advice.'],
      })),
      getAnalysisBlockMessage: vi.fn().mockImplementation((verification) => verification?.shouldAnalyze === false ? verification.warningMessage : null),
    };
  });

  vi.doMock('../../src/sidebar/index.js', () => ({
    initSidebar: vi.fn(() => {
      let sidebar = document.getElementById('tiltcheck-sidebar');
      if (!sidebar) {
        sidebar = document.createElement('div');
        sidebar.id = 'tiltcheck-sidebar';
        document.body.appendChild(sidebar);
      }
      return {
        updateLicense: vi.fn(),
        updateStatus: vi.fn(),
        updateRealityCheck: vi.fn(),
        addFeedMessage: vi.fn(),
        updateTilt: vi.fn(),
        updateStats: vi.fn(),
        notifyBuddy: vi.fn(),
      };
    }),
  }));

  vi.doMock('../../src/analyzer.js', () => {
    class MockAnalyzer {}
    return { Analyzer: MockAnalyzer };
  });

  vi.doMock('../../src/FairnessService.js', () => {
    class MockFairnessService {
      verifyCasinoResult = vi.fn();
      hashToFloat = vi.fn();
      getDiceResult = vi.fn();
      getLimboResult = vi.fn();
      generateHash = vi.fn();
      getPlinkoPath = vi.fn().mockReturnValue([]);
    }
    return { FairnessService: MockFairnessService };
  });

  vi.doMock('@tiltcheck/utils', () => {
    class MockSolanaProvider {
      getLatestBlockHash = vi.fn().mockResolvedValue('block-hash');
    }
    return { SolanaProvider: MockSolanaProvider };
  });
}

describe('Sidebar/content/page-bridge message contracts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('handles content message contract (toggle/open/get sidebar state)', async () => {
    const { listeners } = createChromeMock();
    mockContentDependencies();

    (window as any).TiltCheckSidebar = {
      create: vi.fn(() => {
        let sidebar = document.getElementById('tiltcheck-sidebar');
        if (!sidebar) {
          sidebar = document.createElement('div');
          sidebar.id = 'tiltcheck-sidebar';
          sidebar.style.display = 'none';
          document.body.appendChild(sidebar);
        }
        return sidebar;
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

    const getStateResponse = vi.fn();
    onMessage({ type: 'get_sidebar_state' }, null, getStateResponse);
    expect(getStateResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        exists: false,
        coreOnly: true,
      }),
    );

    const toggleResponse = vi.fn();
    onMessage({ type: 'toggle_sidebar' }, null, toggleResponse);
    await flush();
    expect(toggleResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        coreOnly: true,
      }),
    );

    const openResponse = vi.fn();
    onMessage({ type: 'open_sidebar' }, null, openResponse);
    await vi.waitFor(() => {
      expect(openResponse).toHaveBeenCalled();
    });
    expect(openResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        coreOnly: true,
      }),
    );
  });

  it('emits page-bridge TX_SENT with correlated requestId', async () => {
    const postMessageSpy = vi.spyOn(window, 'postMessage').mockImplementation(() => {});

    (window as any).solanaWeb3 = {
      Transaction: {
        from: vi.fn().mockReturnValue({}),
      },
    };
    (window as any).solana = {
      signAndSendTransaction: vi.fn().mockResolvedValue({ signature: 'sig-123' }),
      connect: vi.fn(),
    };

    await import('../../src/page-bridge.ts');

    window.dispatchEvent(
      new MessageEvent('message', {
        source: window,
        data: {
          source: 'TILTCHECK_EXT',
          type: 'SIGN_AND_SEND',
          transactionBase64: btoa('abc'),
          requestId: 'req-1',
        },
      }),
    );

    await flush();

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'TILTCHECK_PAGE',
        type: 'TX_SENT',
        signature: 'sig-123',
        requestId: 'req-1',
      }),
      '*',
    );
  });

  it('validates versioned native-web bridge commands', async () => {
    const bridge = await import('../../src/native-web-bridge.ts');

    expect(bridge.isNativeToWebBridgeMessage({
      version: bridge.TILTCHECK_BRIDGE_VERSION,
      type: 'init',
      features: { wallet: true },
      config: { logLevel: 'debug' },
    })).toBe(true);

    expect(bridge.isNativeToWebBridgeMessage({
      version: 2,
      type: 'init',
    })).toBe(false);

    expect(bridge.isNativeToWebBridgeMessage({
      version: bridge.TILTCHECK_BRIDGE_VERSION,
      type: 'module.start',
    })).toBe(false);
  });

  it('handles native-web bridge init, module control, status, logs, and errors', async () => {
    const bridge = await import('../../src/native-web-bridge.ts');
    const postMessageSpy = vi.spyOn(window, 'postMessage').mockImplementation(() => {});

    await import('../../src/page-bridge.ts');

    window.dispatchEvent(
      new MessageEvent('message', {
        source: window,
        data: {
          source: bridge.BRIDGE_SOURCE_NATIVE,
          version: bridge.TILTCHECK_BRIDGE_VERSION,
          type: 'init',
          requestId: 'init-1',
          features: { wallet: true },
          config: { logLevel: 'debug' },
        },
      }),
    );

    await flush();

    expect(postedPayloads(postMessageSpy)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: bridge.BRIDGE_SOURCE_WEB,
        version: bridge.TILTCHECK_BRIDGE_VERSION,
        type: 'log',
        level: 'info',
        message: 'Bridge initialized',
      }),
      expect.objectContaining({
        source: bridge.BRIDGE_SOURCE_WEB,
        version: bridge.TILTCHECK_BRIDGE_VERSION,
        type: 'status.response',
        requestId: 'init-1',
        status: expect.objectContaining({
          initialized: true,
          features: { wallet: true },
          config: { logLevel: 'debug' },
        }),
      }),
    ]));

    window.dispatchEvent(
      new MessageEvent('message', {
        source: window,
        data: {
          source: bridge.BRIDGE_SOURCE_NATIVE,
          version: bridge.TILTCHECK_BRIDGE_VERSION,
          type: 'module.start',
          module: 'wallet',
          requestId: 'start-1',
        },
      }),
    );
    await flush();

    expect(postedPayloads(postMessageSpy)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: bridge.BRIDGE_SOURCE_WEB,
        version: bridge.TILTCHECK_BRIDGE_VERSION,
        type: 'module.state',
        module: 'wallet',
        state: 'running',
        requestId: 'start-1',
      }),
    ]));

    window.TiltCheckBridge?.log('warn', 'Synthetic bridge log', { module: 'wallet' });

    window.dispatchEvent(
      new MessageEvent('message', {
        source: window,
        data: {
          source: bridge.BRIDGE_SOURCE_NATIVE,
          version: bridge.TILTCHECK_BRIDGE_VERSION,
          type: 'status.request',
          requestId: 'status-1',
        },
      }),
    );
    await flush();

    expect(postedPayloads(postMessageSpy)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: bridge.BRIDGE_SOURCE_WEB,
        version: bridge.TILTCHECK_BRIDGE_VERSION,
        type: 'log',
        level: 'warn',
        message: 'Synthetic bridge log',
        context: { module: 'wallet' },
      }),
      expect.objectContaining({
        source: bridge.BRIDGE_SOURCE_WEB,
        version: bridge.TILTCHECK_BRIDGE_VERSION,
        type: 'status.response',
        requestId: 'status-1',
        status: expect.objectContaining({
          initialized: true,
          modules: expect.arrayContaining([
            expect.objectContaining({
              module: 'wallet',
              state: 'running',
              details: expect.objectContaining({
                enabled: true,
              }),
            }),
          ]),
        }),
      }),
    ]));

    window.dispatchEvent(
      new MessageEvent('message', {
        source: window,
        data: {
          source: bridge.BRIDGE_SOURCE_NATIVE,
          version: bridge.TILTCHECK_BRIDGE_VERSION,
          type: 'module.start',
          module: 'missing',
          requestId: 'missing-1',
        },
      }),
    );
    await flush();

    expect(postedPayloads(postMessageSpy)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: bridge.BRIDGE_SOURCE_WEB,
        version: bridge.TILTCHECK_BRIDGE_VERSION,
        type: 'error',
        code: 'UNKNOWN_MODULE',
        requestId: 'missing-1',
      }),
    ]));
  });

  it('resolves wallet-bridge sendTransaction only on matching requestId', async () => {
    vi.doMock('@solana/web3.js', () => {
      class PublicKey {
        constructor(private readonly value: string) {}
        toString() {
          return this.value;
        }
      }
      class Transaction {
        feePayer: PublicKey | null = null;
        serialize() {
          return new Uint8Array([1, 2, 3]);
        }
      }
      class Connection {}
      return { PublicKey, Transaction, Connection };
    });

    const postMessageSpy = vi.spyOn(window, 'postMessage').mockImplementation(() => {});

    const { WalletBridge } = await import('../../src/wallet-bridge.ts');
    const { PublicKey, Transaction } = await import('@solana/web3.js');

    const bridge = new WalletBridge();
    bridge.publicKey = new PublicKey('wallet-public-key');
    const tx = new Transaction();

    let resolvedSignature: string | null = null;
    const txPromise = bridge.sendTransaction(tx as any, {} as any).then((signature) => {
      resolvedSignature = signature;
      return signature;
    });

    await flush();

    const signCall = postMessageSpy.mock.calls.find(
      ([payload]) => payload?.source === 'TILTCHECK_EXT' && payload?.type === 'SIGN_AND_SEND',
    );
    expect(signCall).toBeDefined();
    const requestId = signCall![0].requestId as string;
    expect(requestId).toBeTruthy();

    window.dispatchEvent(
      new MessageEvent('message', {
        source: window,
        data: {
          source: 'TILTCHECK_PAGE',
          type: 'TX_SENT',
          signature: 'wrong-signature',
          requestId: 'different-request',
        },
      }),
    );
    await flush();
    expect(resolvedSignature).toBeNull();

    window.dispatchEvent(
      new MessageEvent('message', {
        source: window,
        data: {
          source: 'TILTCHECK_PAGE',
          type: 'TX_SENT',
          signature: 'ok-signature',
          requestId,
        },
      }),
    );

    await expect(txPromise).resolves.toBe('ok-signature');
  });

  it('rejects wallet-bridge sendTransaction on timeout', async () => {
    vi.useFakeTimers();

    vi.doMock('@solana/web3.js', () => {
      class PublicKey {
        constructor(private readonly value: string) {}
        toString() {
          return this.value;
        }
      }
      class Transaction {
        feePayer: PublicKey | null = null;
        serialize() {
          return new Uint8Array([1, 2, 3]);
        }
      }
      class Connection {}
      return { PublicKey, Transaction, Connection };
    });

    vi.spyOn(window, 'postMessage').mockImplementation(() => {});

    const { WalletBridge } = await import('../../src/wallet-bridge.ts');
    const { PublicKey, Transaction } = await import('@solana/web3.js');

    const bridge = new WalletBridge();
    bridge.publicKey = new PublicKey('wallet-public-key');
    const tx = new Transaction();

    const pendingTx = bridge.sendTransaction(tx as any, {} as any);
    const rejectionAssertion = expect(pendingTx).rejects.toThrow('Wallet transaction request timed out');
    await vi.advanceTimersByTimeAsync(15000);

    await rejectionAssertion;
    vi.useRealTimers();
  });
});
