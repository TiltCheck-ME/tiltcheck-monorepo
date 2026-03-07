/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * TiltCheck Casino Data Extractor
 * 
 * Captures gameplay data from casino websites via DOM observation
 * and sends to gameplay analyzer for RTP/fairness analysis.
 */

export interface CasinoSelector {
  casinoId: string;
  domain: string;
  selectors: {
    betAmount?: string;
    winAmount?: string;
    balance?: string;
    symbols?: string;
    bonusIndicator?: string;
    freeSpinsCounter?: string;
    multiplier?: string;
    gameTitle?: string;
    gameResult?: string;
  };
  extractors?: {
    // Custom extraction functions for complex cases
    extractBet?: (doc: Document) => number | null;
    extractWin?: (doc: Document) => number | null;
    extractSymbols?: (doc: Document) => string[] | null;
    extractResult?: (doc: Document) => number | null;
  };
}

export interface SpinEvent {
  bet: number | null;
  win: number | null;
  balance: number | null;
  gameResult: number | null;
  symbols: string[] | null;
  bonusActive: boolean;
  freeSpins: number | null;
  gameTitle: string | null;
  timestamp: number;
}

// Casino-specific selectors
export const CASINO_SELECTORS: CasinoSelector[] = [
  {
    casinoId: 'stake',
    domain: 'stake.com',
    selectors: {
      betAmount: '[data-test="bet-amount"], .bet-amount, [class*="betAmount"]',
      winAmount: '[data-test="win-amount"], .win-amount, [class*="winAmount"]',
      balance: '[data-test="balance"], .balance, [class*="balance-value"]',
      symbols: '.reel-symbol, [data-symbol], [class*="symbol"]',
      bonusIndicator: '.free-spins-active, [data-bonus="true"], [class*="freeSpins"]',
      freeSpinsCounter: '.free-spins-count, [class*="freeSpinsCount"]',
      gameTitle: '.game-title, [data-game-name], [class*="gameTitle"]',
      gameResult: '[data-test="dice-result"], .dice-result, [class*="resultValue"], .crash-payout'
    }
  },
  {
    casinoId: 'stake-us',
    domain: 'stake.us',
    selectors: {
      betAmount: '[data-test="bet-amount"], .bet-amount, [class*="betAmount"]',
      winAmount: '[data-test="win-amount"], .win-amount, [class*="winAmount"]',
      balance: '[data-test="balance"], .balance, [class*="balance-value"]',
      symbols: '.reel-symbol, [data-symbol], [class*="symbol"]',
      bonusIndicator: '.free-spins-active, [data-bonus="true"], [class*="freeSpins"]',
      freeSpinsCounter: '.free-spins-count, [class*="freeSpinsCount"]',
      gameTitle: '.game-title, [data-game-name], [class*="gameTitle"]',
      gameResult: '[data-test="dice-result"], .dice-result, [class*="resultValue"], .crash-payout'
    }
  },
  // Stake mirror domains - same selectors as stake.com
  ...['stake.bet', 'stake.games', 'staketr.com', 'staketr2.com', 'staketr3.com', 'staketr4.com', 'stake.bz', 'stake.pet'].map(domain => ({
    casinoId: 'stake' as const,
    domain,
    selectors: {
      betAmount: '[data-test="bet-amount"], .bet-amount, [class*="betAmount"]',
      winAmount: '[data-test="win-amount"], .win-amount, [class*="winAmount"]',
      balance: '[data-test="balance"], .balance, [class*="balance-value"]',
      symbols: '.reel-symbol, [data-symbol], [class*="symbol"]',
      bonusIndicator: '.free-spins-active, [data-bonus="true"], [class*="freeSpins"]',
      freeSpinsCounter: '.free-spins-count, [class*="freeSpinsCount"]',
      gameTitle: '.game-title, [data-game-name], [class*="gameTitle"]',
      gameResult: '[data-test="dice-result"], .dice-result, [class*="resultValue"], .crash-payout'
    }
  })),
  {
    casinoId: 'roobet',
    domain: 'roobet.com',
    selectors: {
      betAmount: '.bet-input input, [name="bet"], [class*="betInput"]',
      winAmount: '.win-display, .payout-amount, [class*="winAmount"]',
      balance: '.user-balance, [class*="userBalance"], [class*="balance"]',
      symbols: '.slot-symbol, [class*="reelSymbol"]',
      bonusIndicator: '.bonus-round-active, [class*="bonusActive"]',
      gameResult: '.crash-payout, .multiplier-display'
    },
    extractors: {
      extractResult: (doc: Document) => {
        const el = doc.querySelector('.crash-payout, .multiplier-display');
        if (!el || !el.textContent) return null;
        // Handle "2.50x" format common in Crash games by removing 'x'
        return parseFloat(el.textContent.replace(/x/i, '').trim());
      }
    }
  },
  {
    casinoId: 'bc-game',
    domain: 'bc.game',
    selectors: {
      betAmount: '[class*="betAmount"], [class*="bet-amount"], input[type="number"]',
      winAmount: '[class*="winAmount"], [class*="win-amount"], [class*="payout"]',
      balance: '[class*="balance"], [class*="userBalance"]',
      symbols: '[class*="symbol"], [class*="reel"]'
    }
  },
  {
    casinoId: 'duelbits',
    domain: 'duelbits.com',
    selectors: {
      betAmount: '.bet-value, [class*="betValue"], [class*="bet-amount"]',
      winAmount: '.win-value, [class*="winValue"], [class*="win-amount"]',
      balance: '[class*="balance"], .user-balance',
      symbols: '[data-reel] img, .reel-symbol, [class*="symbol"]'
    }
  },
  {
    casinoId: 'rollbit',
    domain: 'rollbit.com',
    selectors: {
      betAmount: '[class*="betInput"], [class*="bet-amount"], input[name="bet"]',
      winAmount: '[class*="winAmount"], [class*="payout"]',
      balance: '[class*="balance"], [class*="wallet"]',
      symbols: '[class*="symbol"], [class*="reel"]'
    }
  },
  {
    casinoId: 'shuffle',
    domain: 'shuffle.com',
    selectors: {
      betAmount: '[class*="bet"], input[type="number"]',
      winAmount: '[class*="win"], [class*="payout"]',
      balance: '[class*="balance"], [class*="wallet"]',
      symbols: '[class*="symbol"]'
    }
  },
  {
    casinoId: 'gamdom',
    domain: 'gamdom.com',
    selectors: {
      betAmount: '[class*="bet-amount"], [class*="betValue"]',
      winAmount: '[class*="win-amount"], [class*="winValue"]',
      balance: '[class*="balance"]',
      symbols: '[class*="symbol"]'
    }
  },
  {
    casinoId: 'generic',
    domain: '*',
    selectors: {
      betAmount: '[data-bet], .bet, .bet-amount, input[name="bet"], [class*="betAmount"], [class*="bet-input"]',
      winAmount: '[data-win], .win, .win-amount, .payout, [class*="winAmount"], [class*="payout"]',
      balance: '[data-balance], .balance, .user-balance, [class*="balance"], [class*="wallet"]',
      symbols: '[data-symbol], .symbol, .reel-symbol, [class*="symbol"], [class*="reel"]',
      gameResult: '[data-result], .game-result, .result-value, .outcome'
    }
  }
];

/**
 * Extract gameplay data from casino DOM
 */
export class CasinoDataExtractor {
  private casinoConfig: CasinoSelector | null = null;
  private previousBalance: number | null = null;
  private lastSpinTime: number = 0;
  private spinDebounceMs: number = 1000; // Don't capture spins faster than 1/sec

  constructor(casinoDomain?: string) {
    this.detectCasino(casinoDomain);
  }

  /**
   * Initialize with custom user configurations
   */
  async initialize(): Promise<void> {
    return new Promise((resolve) => {
      try {
        // Use sync storage for cross-device persistence
        const storage = chrome.storage.sync || chrome.storage.local;
        storage.get(['tiltcheck_custom_casinos'], (result) => {
          const custom = (result.tiltcheck_custom_casinos || []) as CasinoSelector[];
          this.detectCasino(undefined, custom);
          resolve();
        });
      } catch (e) {
        console.warn('[TiltCheck] Failed to load custom casinos:', e);
        resolve();
      }
    });
  }

  /**
   * Detect which casino we're on, prioritizing custom user configs
   */
  private detectCasino(domain?: string, customSelectors: CasinoSelector[] = []): void {
    const currentDomain = domain || window.location.hostname;

    // Merge: Custom selectors take precedence over defaults
    const allSelectors = [...customSelectors, ...CASINO_SELECTORS];

    this.casinoConfig = allSelectors.find(config =>
      currentDomain.includes(config.domain) || config.domain === '*'
    ) || CASINO_SELECTORS.find(c => c.casinoId === 'generic')!;

    console.log('[TiltCheck] Detected casino:', this.casinoConfig.casinoId);
  }

  /**
   * Extract text content from element
   */
  private extractText(selector: string, doc: Document = document): string | null {
    const element = doc.querySelector(selector);
    if (!element) return null;

    // Try various attributes that might contain the value
    const value = element.getAttribute('data-value') ||
      element.getAttribute('value') ||
      element.textContent;

    return value?.trim() || null;
  }

  /**
   * Parse numeric value from text (handles $, commas, etc.)
   */
  private parseNumeric(text: string | null): number | null {
    if (!text) return null;

    // Remove currency symbols, commas, spaces
    const cleaned = text.replace(/[$,\s]/g, '');
    const num = parseFloat(cleaned);

    return isNaN(num) ? null : num;
  }

  /**
   * Extract bet amount
   */
  extractBet(doc: Document = document): number | null {
    if (!this.casinoConfig) return null;

    // Try custom extractor first
    if (this.casinoConfig.extractors?.extractBet) {
      return this.casinoConfig.extractors.extractBet(doc);
    }

    // Use selector
    const selector = this.casinoConfig.selectors.betAmount;
    if (!selector) return null;

    const text = this.extractText(selector, doc);
    return this.parseNumeric(text);
  }

  /**
   * Extract win amount
   */
  extractWin(doc: Document = document): number | null {
    if (!this.casinoConfig) return null;

    // Try custom extractor first
    if (this.casinoConfig.extractors?.extractWin) {
      return this.casinoConfig.extractors.extractWin(doc);
    }

    // Use selector
    const selector = this.casinoConfig.selectors.winAmount;
    if (!selector) return null;

    const text = this.extractText(selector, doc);
    return this.parseNumeric(text);
  }

  /**
   * Extract balance
   */
  extractBalance(doc: Document = document): number | null {
    if (!this.casinoConfig) return null;

    const selector = this.casinoConfig.selectors.balance;
    if (!selector) return null;

    const text = this.extractText(selector, doc);
    return this.parseNumeric(text);
  }

  /**
   * Extract symbols from reels
   */
  extractSymbols(doc: Document = document): string[] | null {
    if (!this.casinoConfig) return null;

    // Try custom extractor first
    if (this.casinoConfig.extractors?.extractSymbols) {
      return this.casinoConfig.extractors.extractSymbols(doc);
    }

    // Use selector
    const selector = this.casinoConfig.selectors.symbols;
    if (!selector) return null;

    const elements = Array.from(doc.querySelectorAll(selector));
    if (elements.length === 0) return null;

    return elements.map(el => {
      // Try data-symbol attribute first
      const dataSymbol = el.getAttribute('data-symbol');
      if (dataSymbol) return dataSymbol;

      // Try alt attribute (for images)
      const alt = el.getAttribute('alt');
      if (alt) return alt;

      // Try src filename
      const src = el.getAttribute('src');
      if (src) {
        const filename = src.split('/').pop()?.split('.')[0];
        if (filename) return filename;
      }

      // Fall back to text content
      return el.textContent?.trim() || 'unknown';
    });
  }

  /**
   * Check if bonus round is active
   */
  isBonusActive(doc: Document = document): boolean {
    if (!this.casinoConfig) return false;

    const selector = this.casinoConfig.selectors.bonusIndicator;
    if (!selector) return false;

    return doc.querySelector(selector) !== null;
  }

  /**
   * Extract free spins count
   */
  extractFreeSpinsCount(doc: Document = document): number | null {
    if (!this.casinoConfig) return null;

    const selector = this.casinoConfig.selectors.freeSpinsCounter;
    if (!selector) return null;

    const text = this.extractText(selector, doc);
    return this.parseNumeric(text);
  }

  /**
   * Extract game title
   */
  extractGameTitle(doc: Document = document): string | null {
    if (!this.casinoConfig) return null;

    const selector = this.casinoConfig.selectors.gameTitle;
    if (!selector) return null;

    return this.extractText(selector, doc);
  }

  /**
   * Extract game result (e.g. dice roll)
   */
  extractGameResult(doc: Document = document): number | null {
    if (!this.casinoConfig) return null;

    // Try custom extractor first
    if (this.casinoConfig.extractors?.extractResult) {
      return this.casinoConfig.extractors.extractResult(doc);
    }

    const selector = this.casinoConfig.selectors.gameResult;
    if (!selector) return null;

    const text = this.extractText(selector, doc);
    return this.parseNumeric(text);
  }

  /**
   * Attempt to extract a complete spin event
   */
  extractSpinEvent(doc: Document = document): SpinEvent | null {
    const now = Date.now();

    // Debounce - don't capture spins too frequently
    if (now - this.lastSpinTime < this.spinDebounceMs) {
      return null;
    }

    const bet = this.extractBet(doc);
    const win = this.extractWin(doc);
    const balance = this.extractBalance(doc);

    // Need at least bet and win to have a valid spin
    if (bet === null && win === null) {
      return null;
    }

    const symbols = this.extractSymbols(doc);
    const bonusActive = this.isBonusActive(doc);
    const freeSpins = this.extractFreeSpinsCount(doc);
    const gameTitle = this.extractGameTitle(doc);
    const gameResult = this.extractGameResult(doc);

    // Detect spin completion by balance change
    if (balance !== null && this.previousBalance !== null) {
      const balanceChange = balance - this.previousBalance;

      // If balance changed, we had a spin
      if (Math.abs(balanceChange) > 0.01) {
        this.lastSpinTime = now;
        this.previousBalance = balance;

        return {
          bet: bet !== null ? bet : Math.abs(balanceChange) - (win || 0),
          win: win !== null ? win : 0,
          balance,
          gameResult,
          symbols,
          bonusActive,
          freeSpins,
          gameTitle,
          timestamp: now
        };
      }
    } else if (balance !== null) {
      this.previousBalance = balance;
    }

    return null;
  }

  /**
   * Start observing the DOM for gameplay
   */
  startObserving(callback: (spinData: ReturnType<typeof this.extractSpinEvent>) => void): () => void {
    console.log('[TiltCheck] Starting DOM observation...');

    // Poll-based approach (more reliable than MutationObserver for some sites)
    const pollInterval = setInterval(() => {
      const spinData = this.extractSpinEvent();
      if (spinData) {
        callback(spinData);
      }
    }, 500); // Check every 500ms

    // Also use MutationObserver for faster detection
    const observer = new MutationObserver(() => {
      const spinData = this.extractSpinEvent();
      if (spinData) {
        callback(spinData);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-value', 'value', 'class']
    });

    // Return cleanup function
    return () => {
      clearInterval(pollInterval);
      observer.disconnect();
      console.log('[TiltCheck] Stopped DOM observation');
    };
  }
}

/**
 * Helper to save a custom casino configuration
 * Use this from your Popup or Options UI to save user inputs
 */
export function saveCustomCasino(config: CasinoSelector): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const storage = chrome.storage.sync || chrome.storage.local;
      storage.get(['tiltcheck_custom_casinos'], (result) => {
        const current = (result.tiltcheck_custom_casinos || []) as CasinoSelector[];
        // Remove existing with same ID to allow updates
        const filtered = current.filter(c => c.casinoId !== config.casinoId);
        filtered.push(config);
        storage.set({ tiltcheck_custom_casinos: filtered }, () => resolve());
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * WebSocket client to send data to analyzer backend
 */
export class AnalyzerClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;

  constructor(private wsUrl: string) { }

  /**
   * Connect to analyzer backend
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('[TiltCheck] Connecting to analyzer...', this.wsUrl);

      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('[TiltCheck] Connected to analyzer');
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('[TiltCheck] WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = () => {
        console.log('[TiltCheck] Disconnected from analyzer');
        this.attemptReconnect();
      };
    });
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[TiltCheck] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[TiltCheck] Reconnecting in ${this.reconnectDelay}ms... (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(err => {
        console.error('[TiltCheck] Reconnect failed:', err);
      });
    }, this.reconnectDelay);
  }

  /**
   * Send spin data to analyzer
   */
  sendSpin(data: {
    sessionId: string;
    casinoId: string;
    gameId: string;
    userId: string;
    bet: number;
    payout: number;
    gameResult?: number | null;
    symbols?: string[];
    bonusRound?: boolean;
    freeSpins?: boolean;
  }): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[TiltCheck] WebSocket not connected, buffering spin data');
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'spin',
      data
    }));
  }

  /**
   * Request fairness report
   */
  requestReport(sessionId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const messageHandler = (event: MessageEvent) => {
        const message = JSON.parse(event.data);
        if (message.type === 'report' && message.sessionId === sessionId) {
          this.ws!.removeEventListener('message', messageHandler);
          resolve(message.data);
        }
      };

      this.ws.addEventListener('message', messageHandler);

      this.ws.send(JSON.stringify({
        type: 'request_report',
        sessionId
      }));

      // Timeout after 5 seconds
      setTimeout(() => {
        this.ws!.removeEventListener('message', messageHandler);
        reject(new Error('Report request timeout'));
      }, 5000);
    });
  }

  /**
   * Close connection
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
