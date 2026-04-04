// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-04

import type { SessionState } from '../state/SessionState.js';
import { formatDuration } from '../utils/math.js';

export class VaultView {
  private container: HTMLElement;
  private state: SessionState;
  private userId: string;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  constructor(container: HTMLElement, state: SessionState, userId: string) {
    this.container = container;
    this.state = state;
    this.userId = userId;
  }

  async mount(): Promise<void> {
    await this.fetchVaultStatus();
    this.render();
    this.state.on('vault', () => this.render());
  }

  private async fetchVaultStatus(): Promise<void> {
    try {
      const res = await fetch(`/api/user/${this.userId}/vault`);
      if (!res.ok) return;
      const data = await res.json();
      this.state.updateVault({
        activeVaults: data.locked ? 1 : 0,
        totalVaultedBalance: data.amount || 0,
        profitGuardActive: data.profitGuardActive || false,
        profitGuardThreshold: data.profitGuardThreshold || 500,
        lockedUntil: data.unlockAt ? new Date(data.unlockAt) : null
      });
    } catch (_) { /* non-fatal */ }
  }

  render(): void {
    const vault = this.state.vault;
    const isLocked = vault.activeVaults > 0 && vault.lockedUntil !== null;

    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }

    this.container.innerHTML = `
      <div class="view-vault">
        <div class="vault-status ${isLocked ? 'locked' : 'unlocked'}">
          <span class="vault-badge">${isLocked ? 'LOCKED' : 'UNLOCKED'}</span>
          ${isLocked ? `
            <div class="vault-locked-info">
              <span class="vault-amount">${vault.totalVaultedBalance.toFixed(3)} SOL</span>
              <span class="vault-countdown" id="vault-countdown">--</span>
            </div>
          ` : ''}
        </div>

        <div class="profit-guard-row">
          <span class="guard-label">Profit Guard</span>
          <label class="toggle">
            <input type="checkbox" id="profit-guard-toggle" ${vault.profitGuardActive ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
          <span class="guard-label">Auto-lock at $${vault.profitGuardThreshold}</span>
        </div>

        ${!isLocked ? `
        <div class="vault-lock-form">
          <input type="number" id="vault-amount" class="vault-input" placeholder="SOL amount" step="0.01" min="0" />
          <div class="duration-row">
            <button class="dur-btn" data-ms="3600000">1H</button>
            <button class="dur-btn active" data-ms="14400000">4H</button>
            <button class="dur-btn" data-ms="86400000">24H</button>
            <button class="dur-btn" data-ms="259200000">72H</button>
          </div>
          <button class="btn-lock" id="vault-lock-btn">LOCK VAULT</button>
        </div>
        ` : `
        <div class="vault-actions">
          <button class="btn-unlock" id="vault-unlock-btn">REQUEST UNLOCK</button>
        </div>
        `}
      </div>
    `;

    if (isLocked && vault.lockedUntil) {
      this.startCountdown(vault.lockedUntil);
    }

    this.attachListeners();
  }

  private startCountdown(unlockDate: Date): void {
    const el = document.getElementById('vault-countdown');
    const update = () => {
      const ms = unlockDate.getTime() - Date.now();
      if (ms <= 0) {
        if (el) el.textContent = 'Unlocking...';
        if (this.countdownTimer) clearInterval(this.countdownTimer);
        this.fetchVaultStatus();
        return;
      }
      if (el) el.textContent = 'Unlocks in ' + formatDuration(ms);
    };
    update();
    this.countdownTimer = setInterval(update, 1000);
  }

  private attachListeners(): void {
    let selectedMs = 14400000;

    this.container.querySelectorAll('.dur-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedMs = parseInt((btn as HTMLElement).dataset.ms!, 10);
      });
    });

    document.getElementById('vault-lock-btn')?.addEventListener('click', async () => {
      const amountInput = document.getElementById('vault-amount') as HTMLInputElement;
      const amount = parseFloat(amountInput?.value ?? '0');
      if (!amount || amount <= 0) return;

      try {
        const res = await fetch(`/api/user/${this.userId}/vault/lock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amountSol: amount, durationMs: selectedMs })
        });
        if (res.ok) {
          await this.fetchVaultStatus();
        }
      } catch (_) { /* non-fatal */ }
    });

    document.getElementById('vault-unlock-btn')?.addEventListener('click', async () => {
      try {
        await fetch(`/api/user/${this.userId}/vault/unlock`, { method: 'POST' });
        await this.fetchVaultStatus();
      } catch (_) { /* non-fatal */ }
    });

    document.getElementById('profit-guard-toggle')?.addEventListener('change', (e) => {
      const active = (e.target as HTMLInputElement).checked;
      this.state.updateVault({ profitGuardActive: active });
    });
  }
}
