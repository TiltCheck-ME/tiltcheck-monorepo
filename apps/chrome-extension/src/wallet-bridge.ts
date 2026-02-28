/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { PublicKey, Transaction, Connection } from '@solana/web3.js';

/**
 * Bridges the gap between the Extension Content Script (Isolated World)
 * and the Browser Page (Main World) where window.solana lives.
 */
export class WalletBridge {
  publicKey: PublicKey | null = null;
  private isConnected: boolean = false;

  constructor() {
    // page-bridge.js runs in MAIN world via manifest — no inline injection needed
    this.listenForResponses();
  }

  private listenForResponses() {
    window.addEventListener('message', (event) => {
      if (event.data.source !== 'TILTCHECK_PAGE') return;

      if (event.data.type === 'CONNECTED') {
        this.publicKey = new PublicKey(event.data.publicKey);
        this.isConnected = true;
        console.log("TiltCheck: Wallet Connected", this.publicKey.toString());
      }
    });
  }

  async connect() {
    window.postMessage({ source: 'TILTCHECK_EXT', type: 'CONNECT' }, '*');
  }

  /**
   * Matches the interface expected by SolanaProvider.
   */
  async sendTransaction(transaction: Transaction, connection: Connection): Promise<string> {
    if (!this.publicKey) throw new Error("Wallet not connected");

    // Serialize transaction to pass over postMessage
    // We need to partially sign or set fee payer before serializing if not done
    transaction.feePayer = this.publicKey;
    const serialized = transaction.serialize({ requireAllSignatures: false });
    const base64 = btoa(String.fromCharCode(...serialized));

    return new Promise((resolve, reject) => {
      const handler = (event: MessageEvent) => {
        if (event.data.source !== 'TILTCHECK_PAGE') return;
        if (event.data.type === 'TX_SENT') {
          window.removeEventListener('message', handler);
          resolve(event.data.signature);
        }
      };
      window.addEventListener('message', handler);
      window.postMessage({ source: 'TILTCHECK_EXT', type: 'SIGN_AND_SEND', transactionBase64: base64 }, '*');
    });
  }
}