/* © 2026 TiltCheck Ecosystem. All Rights Reserved. */

/**
 * Stake.US Sensor (Reality Check Edition)
 * 
 * Optimized for:
 * - High-speed bet detection via data-test attributes.
 * - Precision winnings capture.
 * - Balance drift monitoring.
 */

import { BaseSensor, RoundData } from '../core/Sensor.js';

export class StakeSensor extends BaseSensor {
  private observer: MutationObserver | null = null;
  private onRoundCallback: ((round: RoundData) => void) | null = null;

  constructor(isUS: boolean = false) {
    super(isUS ? 'stake-us' : 'stake');
  }

  async initialize(): Promise<void> {
    console.log(`[TiltCheck] Sensory input initialized for ${this.casinoId}`);
    return Promise.resolve();
  }

  start(callback: (round: RoundData) => void): void {
    console.log(`[TiltCheck] ${this.casinoId} sensor protocol active.`);
    this.onRoundCallback = callback;

    this.observer = new MutationObserver(() => this.detectRound());
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-test', 'class']
    });

    // Fallback polling for sites with heavy shadow DOM or late renders
    setInterval(() => this.detectRound(), 1000);
  }

  private detectRound(): void {
    const rawBalance = this.getSelectorText('[data-test="balance"]');
    const balance = this.parseCurrency(rawBalance);

    if (this.lastBalance === null) {
      this.lastBalance = balance;
      return;
    }

    // Capture round if balance changes significantly
    if (Math.abs(balance - this.lastBalance) > 0.00000001) {
      const now = Date.now();
      if (now - this.lastRoundTime < this.debounceMs) return;

      const bet = this.parseCurrency(this.getSelectorText('[data-test="bet-amount"]'));
      const win = this.parseCurrency(this.getSelectorText('[data-test="win-amount"]'));

      const round: RoundData = {
        bet: bet || 0,
        win: win || 0,
        balance,
        timestamp: now,
        gameId: this.getSelectorText('.game-title') || 'unknown-game',
      };

      this.lastBalance = balance;
      this.lastRoundTime = now;
      if (this.onRoundCallback) this.onRoundCallback(round);
    }
  }

  stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  snapshot(): RoundData | null {
    return null; // Implementation specialized for stream
  }

  private getSelectorText(sel: string): string | null {
    const el = document.querySelector(sel);
    if (!el) return null;
    return el.getAttribute('data-value') || el.textContent;
  }
}
