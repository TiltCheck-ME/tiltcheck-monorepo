/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { Connection, PublicKey } from '@solana/web3.js';
import { SidebarUI } from './types.js';

export class BlockchainManager {
  private ui: SidebarUI;
  private connection: Connection;
  private walletAddress: string | null = null;
  private lastBalance: number | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(ui: SidebarUI) {
    this.ui = ui;
    this.connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  }

  public setWallet(address: string | null) {
      if (this.walletAddress === address) return;
      this.walletAddress = address;
      this.lastBalance = null;
      this.stopMonitoring();
      if (address) {
          this.startMonitoring();
      }
  }

  public startMonitoring() {
      if (!this.walletAddress) return;
      this.stopMonitoring();
      
      console.log(`[BlockchainManager] Monitoring wallet: ${this.walletAddress}`);
      this.checkBalance(); // Initial check
      
      this.pollInterval = setInterval(() => {
          this.checkBalance();
      }, 30000); // Check every 30 seconds
  }

  public stopMonitoring() {
      if (this.pollInterval) {
          clearInterval(this.pollInterval);
          this.pollInterval = null;
      }
  }

  private async checkBalance() {
      if (!this.walletAddress) return;
      try {
          const pubkey = new PublicKey(this.walletAddress);
          const balance = await this.connection.getBalance(pubkey);
          const solBalance = balance / 1e9;

          if (this.lastBalance !== null && this.lastBalance !== solBalance) {
              const diff = solBalance - this.lastBalance;
              if (diff > 0) {
                  this.ui.addFeedMessage(`On-chain Signal: Deposit of ${diff.toFixed(4)} SOL detected.`);
              } else if (diff < 0) {
                  this.ui.addFeedMessage(`On-chain Signal: Withdrawal of ${Math.abs(diff).toFixed(4)} SOL detected.`);
              }
          }

          this.lastBalance = solBalance;
      } catch (err) {
          console.error('[BlockchainManager] Error checking balance:', err);
      }
  }
}
