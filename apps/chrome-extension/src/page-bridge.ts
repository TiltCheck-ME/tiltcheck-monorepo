/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08 */
/**
 * Page Bridge — runs in MAIN world to access window.solana
 * Communicates with the content script via postMessage.
 */

import { NativeWebBridgeRuntime, type NativeWebBridgePublicApi } from './native-web-bridge.js';

declare global {
  interface Window {
    solana?: any;
    solanaWeb3?: any;
    TiltCheckBridge?: NativeWebBridgePublicApi;
    __TiltCheckPageBridgeRuntime?: {
      destroy: () => void;
    };
  }
}

window.__TiltCheckPageBridgeRuntime?.destroy();

const nativeWebBridge = new NativeWebBridgeRuntime();
let walletModuleEnabled = false;

nativeWebBridge.registerModule({
  name: 'wallet',
  start: () => {
    walletModuleEnabled = true;
    nativeWebBridge.emitLog('info', 'Wallet bridge module started');
  },
  stop: () => {
    walletModuleEnabled = false;
    nativeWebBridge.emitLog('info', 'Wallet bridge module stopped');
  },
  getStatus: () => ({
    enabled: walletModuleEnabled,
    hasProvider: Boolean(window.solana),
    hasWeb3: Boolean(window.solanaWeb3?.Transaction),
  }),
});

nativeWebBridge.listen();
window.TiltCheckBridge = nativeWebBridge.getPublicApi();

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const handleWalletBridgeMessage = async (event: MessageEvent) => {
  if (event.source !== window) return;
  // Only accept messages from our extension
  if (event.data.source !== 'TILTCHECK_EXT') return;

  if (event.data.type === 'CONNECT') {
    if (window.solana) {
      try {
        nativeWebBridge.emitLog('info', 'Wallet connect requested');
        const resp = await window.solana.connect();
        nativeWebBridge.emitModuleState('wallet', 'running', {
          connected: true,
          enabled: walletModuleEnabled,
        });
        window.postMessage({
          source: 'TILTCHECK_PAGE',
          type: 'CONNECTED',
          publicKey: resp.publicKey.toString()
        }, '*');
      } catch (err) {
        const message = getErrorMessage(err);
        nativeWebBridge.emitModuleState('wallet', 'error', { reason: message });
        nativeWebBridge.emitError('WALLET_CONNECT_FAILED', message);
        console.error('TiltCheck Wallet Error:', err);
      }
    } else {
      nativeWebBridge.emitError('WALLET_UNAVAILABLE', 'Wallet provider is unavailable');
    }
  }

  if (event.data.type === 'SIGN_AND_SEND') {
    try {
      const { transactionBase64, requestId } = event.data;
      if (!window.solana || !window.solanaWeb3?.Transaction) {
        nativeWebBridge.emitError('WALLET_UNAVAILABLE', 'Wallet signing dependencies are unavailable', { requestId }, requestId);
        return;
      }

      nativeWebBridge.emitLog('info', 'Wallet transaction signing requested', { requestId });
      const buffer = Uint8Array.from(atob(transactionBase64), c => c.charCodeAt(0));
      const transaction = window.solanaWeb3.Transaction.from(buffer);

      const { signature } = await window.solana.signAndSendTransaction(transaction);
      nativeWebBridge.emitModuleState('wallet', 'running', {
        connected: true,
        enabled: walletModuleEnabled,
        lastRequestId: requestId,
      }, requestId);

      window.postMessage({
        source: 'TILTCHECK_PAGE',
        type: 'TX_SENT',
        signature,
        requestId
      }, '*');
    } catch (err) {
      const message = getErrorMessage(err);
      nativeWebBridge.emitModuleState('wallet', 'error', { reason: message, requestId: event.data.requestId }, event.data.requestId);
      nativeWebBridge.emitError('WALLET_SIGN_FAILED', message, { requestId: event.data.requestId }, event.data.requestId);
      console.error('TiltCheck Sign Error:', err);
    }
  }
};

window.addEventListener('message', handleWalletBridgeMessage);

window.__TiltCheckPageBridgeRuntime = {
  destroy: () => {
    nativeWebBridge.destroy();
    window.removeEventListener('message', handleWalletBridgeMessage);
  },
};
