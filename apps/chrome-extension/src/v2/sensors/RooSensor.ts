// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-04

import { BaseSensor, RoundData } from '../core/Sensor.js';

export class RooSensor extends BaseSensor {
  private observer: MutationObserver | null = null;
  private onRoundCallback: ((round: RoundData) => void) | null = null;

  constructor() {
    super('roobet');
  }

  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  start(callback: (round: RoundData) => void): void {
    this.onRoundCallback = callback;

    this.observer = new MutationObserver(() => this.detectRound());
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-amount']
    });

    setInterval(() => this.detectRound(), 1500);
  }

  private detectRound(): void {
    // Roobet uses a balance display in the header nav
    const balanceEl = document.querySelector('[class*="balance"]') ??
      document.querySelector('[data-testid="wallet-balance"]');
    const balance = this.parseCurrency(balanceEl?.textContent ?? null);

    if (this.lastBalance === null) {
      this.lastBalance = balance;
      return;
    }

    if (Math.abs(balance - this.lastBalance) < 0.000001) return;

    const now = Date.now();
    if (now - this.lastRoundTime < this.debounceMs) return;

    // Best-effort bet/win extraction from result overlay
    const betEl = document.querySelector('[class*="betAmount"]') ??
      document.querySelector('[class*="bet-amount"]');
    const winEl = document.querySelector('[class*="winAmount"]') ??
      document.querySelector('[class*="profit"]');

    const bet = this.parseCurrency(betEl?.textContent ?? null) || Math.max(0, this.lastBalance - balance);
    const win = this.parseCurrency(winEl?.textContent ?? null) || Math.max(0, balance - this.lastBalance);

    const round: RoundData = {
      bet,
      win,
      balance,
      timestamp: now,
      gameId: document.querySelector('[class*="gameName"]')?.textContent ?? 'unknown-game'
    };

    this.lastBalance = balance;
    this.lastRoundTime = now;
    if (this.onRoundCallback) this.onRoundCallback(round);
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  snapshot(): RoundData | null {
    return null;
  }
}
