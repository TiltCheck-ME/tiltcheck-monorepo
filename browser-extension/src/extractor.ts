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
  };
  extractors?: {
    // Custom extraction functions for complex cases
    extractBet?: (doc: Document) => number | null;
    extractWin?: (doc: Document) => number | null;
    extractSymbols?: (doc: Document) => string[] | null;
  };
}

// Casino-specific selectors
export const CASINO_SELECTORS: CasinoSelector[] = [
  {
    casinoId: 'stake',
    domain: 'stake.com',
    selectors: {
      betAmount: '[data-test="bet-amount"], .bet-amount',
      winAmount: '[data-test="win-amount"], .win-amount',
      balance: '[data-test="balance"], .balance',
      symbols: '.reel-symbol, [data-symbol]',
      bonusIndicator: '.free-spins-active, [data-bonus="true"]',
      freeSpinsCounter: '.free-spins-count',
      gameTitle: '.game-title, [data-game-name]'
    }
  },
  {
    casinoId: 'roobet',
    domain: 'roobet.com',
    selectors: {
      betAmount: '.bet-input input, [name="bet"]',
      winAmount: '.win-display, .payout-amount',
      balance: '.user-balance',
      symbols: '.slot-symbol',
      bonusIndicator: '.bonus-round-active'
    }
  },
  {
    casinoId: 'bc-game',
    domain: 'bc.game',
    selectors: {
      betAmount: '[class*="betAmount"]',
      winAmount: '[class*="winAmount"]',
      balance: '[class*="balance"]',
      symbols: '[class*="symbol"]'
    }
  },
  {
    casinoId: 'duelbits',
    domain: 'duelbits.com',
    selectors: {
      betAmount: '.bet-value',
      winAmount: '.win-value',
      symbols: '[data-reel] img, .reel-symbol'
    }
  },
  {
    casinoId: 'generic',
    domain: '*',
    selectors: {
      betAmount: '[data-bet], .bet, .bet-amount, input[name="bet"]',
      winAmount: '[data-win], .win, .win-amount, .payout',
      balance: '[data-balance], .balance, .user-balance',
      symbols: '[data-symbol], .symbol, .reel-symbol, [class*="symbol"]'
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
   * Detect which casino we're on
   */
  private detectCasino(domain?: string): void {
    const currentDomain = domain || window.location.hostname;
    
    this.casinoConfig = CASINO_SELECTORS.find(config => 
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
   * Attempt to extract a complete spin event
   */
  extractSpinEvent(doc: Document = document): {
    bet: number | null;
    win: number | null;
    balance: number | null;
    symbols: string[] | null;
    bonusActive: boolean;
    freeSpins: number | null;
    gameTitle: string | null;
    timestamp: number;
  } | null {
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
 * WebSocket client to send data to analyzer backend
 */
export class AnalyzerClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;
  
  constructor(private wsUrl: string) {}
  
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
