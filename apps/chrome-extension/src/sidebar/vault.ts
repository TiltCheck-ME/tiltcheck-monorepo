/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17 */
import { SidebarController } from './index.js';
import { AutoVaultEngine, LogEntry } from '../autovault.js';

export class VaultManager {
  private controller: SidebarController;
  private lockTimerInterval: any = null;
  private autoVault: AutoVaultEngine | null = null;
  private userId: string | null = null;

  constructor(controller: SidebarController) {
    this.controller = controller;
  }

  public init() {
    this.userId = this.controller.auth.userData?.id || null;
    this.initAutoVault();
  }

  private initAutoVault() {
    this.autoVault = new AutoVaultEngine({
      onLogEntry: (entry: LogEntry) => {
        this.controller.addFeedMessage(`[Vault] ${entry.message}`);
        if (entry.type === 'error' || entry.type === 'warning') {
          this.controller.updateStatus(entry.message, entry.type === 'error' ? 'danger' : 'warning');
        }
      },
      onVaultCountUpdate: (count, max) => {
        if (count >= max) {
          this.controller.updateStatus('Vault rate limit reached inside Stake.', 'warning');
        }
      },
      onVaultedUpdate: (amount, currency) => {
        const el = document.getElementById('tg-autovault-secured');
        if (el) el.textContent = `${amount.toFixed(6)} ${currency.toUpperCase()}`;
      },
      onRunningChange: (running) => {
        const toggle = document.getElementById('tg-autovault-toggle') as HTMLInputElement;
        const controls = document.getElementById('tg-autovault-controls');
        if (toggle) toggle.checked = running;
        if (controls) controls.style.display = running ? 'block' : 'none';
      }
    });

    // Restore settings from UI if already interacted
    const pctInput = document.getElementById('tg-autovault-pct') as HTMLInputElement;
    if (pctInput) {
      this.autoVault.setConfig({ saveAmount: parseInt(pctInput.value) / 100 });
    }
  }

  public toggleAutoVault(enabled: boolean) {
    if (!this.autoVault) return;
    if (enabled) {
      this.autoVault.start();
    } else {
      this.autoVault.stop();
    }
  }

  public setAutoVaultPct(pct: number) {
    if (this.autoVault) {
      this.autoVault.setConfig({ saveAmount: pct / 100 });
    }
  }

  public async lockTheBag(_amount: number) {
    const userId = this.controller.auth.userData?.id;
    if (!userId) {
        this.controller.updateStatus('Connect Discord to use the Vault.', 'warning');
        return;
    }

    this.controller.updateStatus('Opening vault controls...', 'thinking');
    this.controller.addFeedMessage('EMERGENCY BRAKE: Opening vault dashboard to secure your bag.');

    // Send the user to the vault dashboard — real profit-locking happens there.
    chrome.runtime.sendMessage({ type: 'open_vault' });

    setTimeout(() => {
        this.controller.updateStatus('Vault controls opened. Go secure the bag.', 'success');
    }, 1000);
  }

  public async depositToVault(amount: number, userId: string) {
    if (!userId || !amount) return;
    try {
      this.controller.addFeedMessage(`Vaulted $${amount.toFixed(2)}`);
    } catch (err) {
      console.error('[VaultManager] deposit error:', err);
    }
  }

  public async loadVaultBalance(userId: string) {
    if (!userId) return;
  }

  public renderVaultTimeline(_locks: any[]) {
    const container = document.getElementById('tg-vault-timeline');
    if (!container) return;
  }

  public startLockCountdown(_unlockTime: number, _startTime: number) {
    if (this.lockTimerInterval) clearInterval(this.lockTimerInterval);
  }
}
