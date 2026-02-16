import { PublicKey, Transaction, Connection } from '@solana/web3.js';

/**
 * Bridges the gap between the Extension Content Script (Isolated World)
 * and the Browser Page (Main World) where window.solana lives.
 */
export class WalletBridge {
  publicKey: PublicKey | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.injectScript();
    this.listenForResponses();
  }

  /**
   * Injects a small script into the page to proxy wallet requests.
   */
  private injectScript() {
    const script = document.createElement('script');
    script.textContent = `
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
            // Deserialize transaction (simplified for demo)
            // In prod, you'd deserialize the Buffer/Uint8Array
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
    `;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
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