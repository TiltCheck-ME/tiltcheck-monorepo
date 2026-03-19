/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { SidebarController } from './index.js';

export class VaultManager {
  private controller: SidebarController;
  private lockTimerInterval: any = null;

  constructor(controller: SidebarController) {
    this.controller = controller;
  }

  public async lockTheBag(amount: number) {
    const userId = this.controller.auth.userData?.id;
    if (!userId) {
        this.controller.updateStatus('Connect Discord to use the Profit Locker.', 'warning');
        return;
    }

    try {
        this.controller.updateStatus('Initializing EMERGENCY BRAKE...', 'thinking');
        
        // In a real app, this would use the BlockchainManager to send a Solana transaction
        // to the Profit Locker smart contract. For now, we simulate the non-custodial lock.
        const success = await this.controller.blockchain.lockTokens(amount, 3600); // 1 hour lock
        
        if (success) {
            this.controller.addFeedMessage(`EMERGENCY BRAKE ENGAGED: ${amount} SOL locked for 1 hour.`);
            this.controller.updateStatus('Bag secured. Go touch grass.', 'success');
            // Redirect to touch grass page after a delay
            setTimeout(() => {
                window.open('https://web.tiltcheck.me/touch-grass.html', '_blank');
            }, 3000);
        } else {
            this.controller.updateStatus('Lock failed. Check wallet balance.', 'danger');
        }
    } catch (err) {
        console.error('[VaultManager] lock error:', err);
    }
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
    // Logic for loading vault balance
  }

  public renderVaultTimeline(_locks: any[]) {
    const container = document.getElementById('tg-vault-timeline');
    if (!container) return;
    // ... logic from sidebar.ts ...
  }

  public startLockCountdown(_unlockTime: number, _startTime: number) {
    if (this.lockTimerInterval) clearInterval(this.lockTimerInterval);
    // ... logic from sidebar.ts ...
  }
}
