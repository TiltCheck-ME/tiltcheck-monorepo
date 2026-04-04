// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-04

import { BaseSensor, RoundData } from '../core/Sensor.js';

// Common balance selector patterns ordered by specificity
const BALANCE_SELECTORS = [
  '[data-test="balance"]',
  '[data-testid="wallet-balance"]',
  '[class*="balance-amount"]',
  '[class*="userBalance"]',
  '[class*="wallet-amount"]',
  '[class*="balance"]',
  '[id*="balance"]'
];

const BET_SELECTORS = [
  '[data-test="bet-amount"]',
  '[data-testid="bet-amount"]',
  '[class*="betAmount"]',
  '[class*="bet-amount"]',
  '[class*="wager"]',
  '[id*="bet"]'
];

const WIN_SELECTORS = [
  '[data-test="win-amount"]',
  '[data-testid="win-amount"]',
  '[class*="winAmount"]',
  '[class*="win-amount"]',
  '[class*="profit"]',
  '[id*="win"]'
];

export class GenericCasinoSensor extends BaseSensor {
  private observer: MutationObserver | null = null;
  private onRoundCallback: ((round: RoundData) => void) | null = null;
  private hostname: string;

  constructor(hostname: string) {
    super(hostname);
    this.hostname = hostname;
  }

  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  start(callback: (round: RoundData) => void): void {
    this.onRoundCallback = callback;

    this.observer = new MutationObserver(() => {
      // Debounce via requestIdleCallback to avoid impacting game frame rate
      requestIdleCallback(() => this.detectRound(), { timeout: 500 });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    setInterval(() => this.detectRound(), 2000);
  }

  private detectRound(): void {
    const balanceText = this.findFirst(BALANCE_SELECTORS);
    const balance = this.parseCurrency(balanceText);

    if (this.lastBalance === null) {
      this.lastBalance = balance;
      return;
    }

    if (Math.abs(balance - this.lastBalance) < 0.000001) return;

    const now = Date.now();
    if (now - this.lastRoundTime < this.debounceMs) return;

    const bet = this.parseCurrency(this.findFirst(BET_SELECTORS)) ||
      Math.max(0, this.lastBalance - balance);
    const win = this.parseCurrency(this.findFirst(WIN_SELECTORS)) ||
      Math.max(0, balance - this.lastBalance);

    const round: RoundData = {
      bet,
      win,
      balance,
      timestamp: now,
      gameId: this.hostname
    };

    this.lastBalance = balance;
    this.lastRoundTime = now;
    if (this.onRoundCallback) this.onRoundCallback(round);
  }

  private findFirst(selectors: string[]): string | null {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        return el.getAttribute('data-value') || el.textContent?.trim() || null;
      }
    }
    return null;
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  snapshot(): RoundData | null {
    return null;
  }
}
