import { ethers } from 'ethers';
import { createLogger } from '@tiltcheck/logger';

export interface TransactionAttempt {
  timestamp: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  status: 'pending' | 'confirmed' | 'failed';
  type: 'sweep' | 'incoming' | 'suspicious';
  hash?: string;
  blockNumber?: number;
}

export interface ScanResult {
  timestamp: string;
  target: string;
  name?: string;
  ethBalance: string;
  usdcBalance: string;
  changeFromLast: string;
  txCount: number;
  lastTxHash?: string;
  status: 'normal' | 'suspicious' | 'alert';
  score: number;
}

export interface WalletSecurityReport {
  address: string;
  score: number; // 0-100, higher is better
  threats: string[];
  recommendations: string[];
  isCompromised: boolean;
  details: ScanResult;
}

export class WalletCheckService {
  private provider: ethers.JsonRpcProvider;
  private logger = createLogger({ name: 'WalletCheck' });
  private lastBalances: Map<string, string> = new Map();

  constructor(rpcUrl: string = 'https://cloudflare-eth.com') {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Scans a wallet address for security threats
   */
  async scanWallet(address: string): Promise<WalletSecurityReport> {
    this.logger.info(`Scanning wallet: ${address}`);
    
    try {
      const balance = await this.provider.getBalance(address);
      const balanceEth = ethers.formatEther(balance);
      const txCount = await this.provider.getTransactionCount(address);
      
      // Basic threat detection
      const threats: string[] = [];
      const recommendations: string[] = [];
      let score = 100;

      // 1. Check for suspicious activity (e.g., zero balance but many transactions)
      if (parseFloat(balanceEth) < 0.001 && txCount > 10) {
        threats.push('High transaction count with very low balance may indicate a swept wallet');
        score -= 30;
      }

      // 2. Check for EIP-7702 delegation (simplified check for this migration)
      // In a real implementation, we'd check for delegation markers in the account state
      
      // 3. Mock suspicious token approvals check
      // (This would require scanning contract interactions)

      const lastBalance = this.lastBalances.get(address) || balanceEth;
      const change = parseFloat(balanceEth) - parseFloat(lastBalance);
      this.lastBalances.set(address, balanceEth);

      const scanResult: ScanResult = {
        timestamp: new Date().toISOString(),
        target: address,
        ethBalance: balanceEth,
        usdcBalance: '0', // Placeholder
        changeFromLast: change.toFixed(6),
        txCount,
        status: score < 50 ? 'alert' : score < 80 ? 'suspicious' : 'normal',
        score
      };

      if (score < 50) {
        recommendations.push('Immediate Action Required: Move any remaining funds to a new wallet');
        recommendations.push('Revoke all token approvals');
      } else if (score < 100) {
        recommendations.push('Consider reviewing recent transactions and token approvals');
      } else {
        recommendations.push('Wallet appears secure. Continue following best practices.');
      }

      return {
        address,
        score,
        threats,
        recommendations,
        isCompromised: score < 50,
        details: scanResult
      };

    } catch (error: any) {
      this.logger.error(`Failed to scan wallet ${address}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Monitor a specific address for changes (one-time check for this service call)
   */
  async checkCompromise(address: string): Promise<boolean> {
    const report = await this.scanWallet(address);
    return report.isCompromised;
  }
}
