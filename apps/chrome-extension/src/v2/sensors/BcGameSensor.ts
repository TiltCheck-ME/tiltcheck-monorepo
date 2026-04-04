// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-04

import { BaseSensor, RoundData } from '../core/Sensor.js';
import CryptoJS from 'crypto-js';

interface ProvablyFairData {
  clientSeed: string;
  serverSeedHash: string;
  nonce: number;
}

export class BcGameSensor extends BaseSensor {
  private observer: MutationObserver | null = null;
  private onRoundCallback: ((round: RoundData) => void) | null = null;

  constructor() {
    super('bc.game');
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
      attributes: true
    });

    setInterval(() => this.detectRound(), 1200);
  }

  private detectRound(): void {
    // BC.Game displays balance in a specific container
    const balanceEl = document.querySelector('.balance-amount') ??
      document.querySelector('[class*="userBalance"]') ??
      document.querySelector('[class*="wallet-amount"]');
    const balance = this.parseCurrency(balanceEl?.textContent ?? null);

    if (this.lastBalance === null) {
      this.lastBalance = balance;
      return;
    }

    if (Math.abs(balance - this.lastBalance) < 0.000001) return;

    const now = Date.now();
    if (now - this.lastRoundTime < this.debounceMs) return;

    const betEl = document.querySelector('[class*="betAmount"]') ??
      document.querySelector('[class*="bet_amount"]');
    const winEl = document.querySelector('[class*="winAmount"]') ??
      document.querySelector('[class*="win_amount"]');

    const bet = this.parseCurrency(betEl?.textContent ?? null) || 0;
    const win = this.parseCurrency(winEl?.textContent ?? null) || 0;

    const fairnessResult = this.verifyFairness();

    const round: RoundData = {
      bet,
      win,
      balance,
      timestamp: now,
      gameId: this.getCurrentGameId(),
      metadata: { fairnessVerified: fairnessResult }
    };

    this.lastBalance = balance;
    this.lastRoundTime = now;
    if (this.onRoundCallback) this.onRoundCallback(round);
  }

  private getCurrentGameId(): string {
    const titleEl = document.querySelector('[class*="gameName"]') ??
      document.querySelector('[class*="game-title"]') ??
      document.querySelector('h1');
    return titleEl?.textContent?.trim() ?? 'bc.game';
  }

  private verifyFairness(): boolean | null {
    try {
      const data = this.extractProvablyFairData();
      if (!data) return null;

      const { clientSeed, serverSeedHash, nonce } = data;
      const message = `${clientSeed}:${nonce}`;
      const computedHash = CryptoJS.HmacSHA256(message, serverSeedHash).toString();

      // Verify the hash matches what the casino shows
      const displayedHashEl = document.querySelector('[class*="serverSeedHash"]') ??
        document.querySelector('[data-hash]');
      const displayedHash = displayedHashEl?.textContent?.trim() ??
        displayedHashEl?.getAttribute('data-hash');

      if (!displayedHash) return null;
      return computedHash.startsWith(displayedHash.slice(0, 8));
    } catch (_) {
      return null;
    }
  }

  private extractProvablyFairData(): ProvablyFairData | null {
    const clientSeedEl = document.querySelector('[data-client-seed]');
    const serverHashEl = document.querySelector('[data-server-seed-hash]');
    const nonceEl = document.querySelector('[data-nonce]');

    if (!clientSeedEl || !serverHashEl || !nonceEl) return null;

    return {
      clientSeed: clientSeedEl.getAttribute('data-client-seed') ?? '',
      serverSeedHash: serverHashEl.getAttribute('data-server-seed-hash') ?? '',
      nonce: parseInt(nonceEl.getAttribute('data-nonce') ?? '0', 10)
    };
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  snapshot(): RoundData | null {
    return null;
  }
}
