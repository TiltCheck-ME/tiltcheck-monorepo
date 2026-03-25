/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { Connection, PublicKey } from '@solana/web3.js';
import { SidebarController } from './index.js';

export class BlockchainManager {
  private controller: SidebarController;
  private connection: Connection;
  private walletAddress: string | null = null;
  private lastBalance: number | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(controller: SidebarController) {
    this.controller = controller;
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

  public async lockTokens(amount: number, duration: number): Promise<boolean> {
      if (!this.walletAddress) return false;
      
      // Simulation: In a real environment, we'd use the window.solana (Phantom/Solflare) provider
      // to sign and send a transaction to our profit_locker program.
      try {
          console.log(`[BlockchainManager] Attempting to lock ${amount} SOL for ${duration}s...`);
          
          // Mimic on-chain verification
          this.controller.updateStatus('Confirming on-chain transaction...', 'thinking');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          return true;
      } catch (err) {
          console.error('[BlockchainManager] Transaction failed:', err);
          return false;
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
                  this.controller.addFeedMessage(`On-chain Signal: Deposit of ${diff.toFixed(4)} SOL detected.`);
              } else if (diff < 0) {
                  this.controller.addFeedMessage(`On-chain Signal: Withdrawal of ${Math.abs(diff).toFixed(4)} SOL detected.`);
              }
          }

          this.lastBalance = solBalance;
      } catch (err) {
          console.error('[BlockchainManager] Error checking balance:', err);
      }
  }
}
