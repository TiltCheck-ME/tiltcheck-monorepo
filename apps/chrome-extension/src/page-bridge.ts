/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Page Bridge — runs in MAIN world to access window.solana
 * Communicates with the content script via postMessage.
 */

declare global {
  interface Window {
    solana?: any;
    solanaWeb3?: any;
  }
}

window.addEventListener('message', async (event) => {
  // Only accept messages from our extension
  if (event.data.source !== 'TILTCHECK_EXT') return;

  if (event.data.type === 'CONNECT') {
    if (window.solana) {
      try {
        const resp = await window.solana.connect();
        window.postMessage({
          source: 'TILTCHECK_PAGE',
          type: 'CONNECTED',
          publicKey: resp.publicKey.toString()
        }, '*');
      } catch (err) {
        console.error('TiltCheck Wallet Error:', err);
      }
    }
  }

  if (event.data.type === 'SIGN_AND_SEND') {
    try {
      const { transactionBase64 } = event.data;
      const buffer = Uint8Array.from(atob(transactionBase64), c => c.charCodeAt(0));
      const transaction = window.solanaWeb3.Transaction.from(buffer);

      const { signature } = await window.solana.signAndSendTransaction(transaction);

      window.postMessage({
        source: 'TILTCHECK_PAGE',
        type: 'TX_SENT',
        signature
      }, '*');
    } catch (err) {
      console.error('TiltCheck Sign Error:', err);
    }
  }
});
