/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Wallet Service Tests - Non-Custodial Implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WalletService } from '../src/wallet-service.js';

describe('WalletService - Non-Custodial Architecture', () => {
  let walletService: WalletService;

  beforeEach(() => {
    walletService = new WalletService();
  });

  describe('Wallet Registration', () => {
    it('should register a new x402 wallet', async () => {
      const wallet = await walletService.registerWallet(
        'user123',
        'SOL_ADDRESS_123',
        'x402'
      );

      expect(wallet.userId).toBe('user123');
      expect(wallet.publicAddress).toBe('SOL_ADDRESS_123');
      expect(wallet.provider).toBe('x402');
      expect(wallet.isPrimary).toBe(true);
      expect(wallet.verified).toBe(true);
    });

    it('should register a user-supplied wallet with signature proof', async () => {
      const wallet = await walletService.registerWallet(
        'user456',
        'SOL_ADDRESS_456',
        'user-supplied',
        'SIGNATURE_PROOF'
      );

      expect(wallet.provider).toBe('user-supplied');
      expect(wallet.verified).toBe(true);
    });

    it('should reject user-supplied wallet without signature proof', async () => {
      await expect(
        walletService.registerWallet('user789', 'SOL_ADDRESS_789', 'user-supplied')
      ).rejects.toThrow('Signature proof required');
    });

    it('should prevent duplicate wallet registration', async () => {
      await walletService.registerWallet('user123', 'SOL_ADDRESS_123', 'x402');
      
      await expect(
        walletService.registerWallet('user123', 'SOL_ADDRESS_123', 'x402')
      ).rejects.toThrow('Wallet already registered');
    });

    it('should allow multiple wallets for same user', async () => {
      const wallet1 = await walletService.registerWallet('user123', 'ADDRESS_1', 'x402');
      const wallet2 = await walletService.registerWallet('user123', 'ADDRESS_2', 'phantom');

      expect(wallet1.isPrimary).toBe(true);
      expect(wallet2.isPrimary).toBe(false);

      const allWallets = walletService.getUserWallets('user123');
      expect(allWallets).toHaveLength(2);
    });
  });

  describe('Wallet Retrieval', () => {
    it('should get primary wallet', async () => {
      await walletService.registerWallet('user123', 'ADDRESS_1', 'x402');
      await walletService.registerWallet('user123', 'ADDRESS_2', 'phantom');

      const primary = walletService.getPrimaryWallet('user123');
      expect(primary?.publicAddress).toBe('ADDRESS_1');
      expect(primary?.isPrimary).toBe(true);
    });

    it('should return null for non-existent user', () => {
      const wallet = walletService.getPrimaryWallet('nonexistent');
      expect(wallet).toBeNull();
    });

    it('should get all user wallets', async () => {
      await walletService.registerWallet('user123', 'ADDRESS_1', 'x402');
      await walletService.registerWallet('user123', 'ADDRESS_2', 'phantom');

      const wallets = walletService.getUserWallets('user123');
      expect(wallets).toHaveLength(2);
      expect(wallets[0].publicAddress).toBe('ADDRESS_1');
      expect(wallets[1].publicAddress).toBe('ADDRESS_2');
    });
  });

  describe('Tip Transactions (User → User, Non-Custodial)', () => {
    beforeEach(async () => {
      // Register wallets for sender and recipient
      await walletService.registerWallet('sender123', 'SENDER_ADDRESS', 'x402');
      await walletService.registerWallet('recipient456', 'RECIPIENT_ADDRESS', 'phantom');
    });

    it('should create tip transaction between users', async () => {
      const tx = await walletService.createTipTransaction('sender123', 'recipient456', 10.00);

      expect(tx.type).toBe('tip');
      expect(tx.from).toBe('SENDER_ADDRESS');
      expect(tx.to).toBe('RECIPIENT_ADDRESS');
      expect(tx.amountUSD).toBe(10.00);
      expect(tx.token).toBe('USDC');
      expect(tx.status).toBe('pending');
      expect(tx.userId).toBe('sender123');
    });

    it('should reject tip if sender wallet not registered', async () => {
      await expect(
        walletService.createTipTransaction('unknown', 'recipient456', 10.00)
      ).rejects.toThrow('Sender wallet not registered');
    });

    it('should reject tip if recipient wallet not registered', async () => {
      await expect(
        walletService.createTipTransaction('sender123', 'unknown', 10.00)
      ).rejects.toThrow('Recipient wallet not registered');
    });

    it('should require user approval for tip transaction', async () => {
      const tx = await walletService.createTipTransaction('sender123', 'recipient456', 5.00);
      
      expect(tx.status).toBe('pending');
      expect(tx.approvedAt).toBeUndefined();
    });

    it('should allow user to approve transaction', async () => {
      const tx = await walletService.createTipTransaction('sender123', 'recipient456', 5.00);
      
      await walletService.approveTransaction(tx.id, 'sender123');
      
      const updatedTx = walletService.getTransaction(tx.id);
      expect(updatedTx?.status).toBe('approved');
      expect(updatedTx?.approvedAt).toBeDefined();
    });

    it('should reject approval from wrong user', async () => {
      const tx = await walletService.createTipTransaction('sender123', 'recipient456', 5.00);
      
      await expect(
        walletService.approveTransaction(tx.id, 'wrong_user')
      ).rejects.toThrow('Unauthorized');
    });

    it('should submit signed transaction', async () => {
      const tx = await walletService.createTipTransaction('sender123', 'recipient456', 5.00);
      await walletService.approveTransaction(tx.id, 'sender123');
      
      await walletService.submitSignedTransaction(tx.id, 'USER_SIGNATURE_XYZ');
      
      const updatedTx = walletService.getTransaction(tx.id);
      expect(updatedTx?.signature).toBe('USER_SIGNATURE_XYZ');
      expect(updatedTx?.status).toBe('submitted');
      expect(updatedTx?.transactionHash).toBeDefined();
    });
  });

  describe('Withdrawal Transactions (Treasury → User, Non-Custodial)', () => {
    beforeEach(async () => {
      await walletService.registerWallet('user123', 'USER_ADDRESS', 'x402');
    });

    it('should create withdrawal transaction from treasury', async () => {
      const tx = await walletService.createWithdrawalTransaction('user123', 50.00);

      expect(tx.type).toBe('withdrawal');
      expect(tx.to).toBe('USER_ADDRESS');
      expect(tx.amountUSD).toBe(50.00);
      expect(tx.token).toBe('USDC');
      expect(tx.metadata?.source).toBe('survey-earnings');
    });

    it('should auto-approve treasury transactions', async () => {
      const tx = await walletService.createWithdrawalTransaction('user123', 50.00);
      
      // Treasury transactions are auto-approved (no user signature needed)
      expect(tx.status).toBe('approved');
    });

    it('should reject withdrawal if user wallet not registered', async () => {
      await expect(
        walletService.createWithdrawalTransaction('unknown', 50.00)
      ).rejects.toThrow('User wallet not registered');
    });

    it('should track withdrawal in user transaction history', async () => {
      await walletService.createWithdrawalTransaction('user123', 25.00);
      await walletService.createWithdrawalTransaction('user123', 75.00);

      const history = walletService.getUserTransactions('user123');
      expect(history).toHaveLength(2);
      expect(history[0].amountUSD).toBe(75.00); // Most recent first
      expect(history[1].amountUSD).toBe(25.00);
    });
  });

  describe('Transaction Lifecycle', () => {
    beforeEach(async () => {
      await walletService.registerWallet('user123', 'ADDRESS_123', 'x402');
      await walletService.registerWallet('user456', 'ADDRESS_456', 'phantom');
    });

    it('should track transaction from pending to confirmed', async () => {
      // Create transaction
      const tx = await walletService.createTipTransaction('user123', 'user456', 10.00);
      expect(tx.status).toBe('pending');

      // Approve
      await walletService.approveTransaction(tx.id, 'user123');
      let updated = walletService.getTransaction(tx.id);
      expect(updated?.status).toBe('approved');

      // Sign and submit
      await walletService.submitSignedTransaction(tx.id, 'SIGNATURE');
      updated = walletService.getTransaction(tx.id);
      expect(updated?.status).toBe('submitted');

      // Wait for confirmation (simulated)
      await new Promise(resolve => setTimeout(resolve, 2100));
      updated = walletService.getTransaction(tx.id);
      expect(updated?.status).toBe('confirmed');
    });

    it('should expire transaction after timeout', async () => {
      const tx = await walletService.createTipTransaction('user123', 'user456', 5.00);
      
      // Manually set expiration to past
      tx.expiresAt = Date.now() - 1000;
      
      await expect(
        walletService.approveTransaction(tx.id, 'user123')
      ).rejects.toThrow('Transaction expired');
    });

    it('should prevent double approval', async () => {
      const tx = await walletService.createTipTransaction('user123', 'user456', 5.00);
      await walletService.approveTransaction(tx.id, 'user123');
      
      await expect(
        walletService.approveTransaction(tx.id, 'user123')
      ).rejects.toThrow('Cannot approve transaction in status: approved');
    });
  });

  describe('Bot Wallets (Operational Only)', () => {
    it('should have gas-fees wallet configured', () => {
      const gasWallet = walletService.getBotWallet('gas-fees');
      
      expect(gasWallet).toBeDefined();
      expect(gasWallet?.purpose).toBe('gas-fees');
      expect(gasWallet?.publicAddress).toBeDefined();
    });

    it('should have treasury wallet configured', () => {
      const treasuryWallet = walletService.getBotWallet('treasury');
      
      expect(treasuryWallet).toBeDefined();
      expect(treasuryWallet?.purpose).toBe('treasury');
      expect(treasuryWallet?.publicAddress).toBeDefined();
    });

    it('should use treasury wallet for withdrawals', async () => {
      await walletService.registerWallet('user123', 'USER_ADDRESS', 'x402');
      
      const tx = await walletService.createWithdrawalTransaction('user123', 100.00);
      const treasuryWallet = walletService.getBotWallet('treasury');
      
      expect(tx.from).toBe(treasuryWallet?.publicAddress);
      expect(tx.to).toBe('USER_ADDRESS');
    });
  });

  describe('Non-Custodial Guarantees', () => {
    it('should NEVER store private keys', async () => {
      const wallet = await walletService.registerWallet('user123', 'ADDRESS', 'x402');
      
      // Wallet object should only contain public information
      expect(wallet).not.toHaveProperty('privateKey');
      expect(wallet).not.toHaveProperty('seed');
      expect(wallet).not.toHaveProperty('mnemonic');
    });

    it('should only store public addresses', async () => {
      await walletService.registerWallet('user123', 'PUBLIC_ADDRESS', 'x402');
      
      const wallets = walletService.getUserWallets('user123');
      expect(wallets[0].publicAddress).toBe('PUBLIC_ADDRESS');
      expect(Object.keys(wallets[0])).not.toContain('privateKey');
    });

    it('should require user signature for user-initiated transactions', async () => {
      await walletService.registerWallet('user123', 'ADDR_1', 'x402');
      await walletService.registerWallet('user456', 'ADDR_2', 'x402');
      
      const tx = await walletService.createTipTransaction('user123', 'user456', 10.00);
      
      // Transaction should be pending, waiting for user approval + signature
      expect(tx.status).toBe('pending');
      expect(tx.signature).toBeUndefined();
    });

    it('should enable direct user-to-user transfers', async () => {
      await walletService.registerWallet('alice', 'ALICE_ADDRESS', 'x402');
      await walletService.registerWallet('bob', 'BOB_ADDRESS', 'phantom');
      
      const tx = await walletService.createTipTransaction('alice', 'bob', 15.00);
      
      // Direct transfer: Alice's wallet → Bob's wallet
      // Bot NEVER holds the funds
      expect(tx.from).toBe('ALICE_ADDRESS');
      expect(tx.to).toBe('BOB_ADDRESS');
      
      // Bot wallet should NOT be involved
      const gasWallet = walletService.getBotWallet('gas-fees');
      expect(tx.from).not.toBe(gasWallet?.publicAddress);
      expect(tx.to).not.toBe(gasWallet?.publicAddress);
    });

    it('should allow treasury payouts without user custody', async () => {
      await walletService.registerWallet('user123', 'USER_ADDRESS', 'x402');
      
      const tx = await walletService.createWithdrawalTransaction('user123', 50.00);
      
      // Treasury → User (direct)
      // TiltCheck pays rewards FROM treasury TO user
      // No intermediate custody
      const treasuryWallet = walletService.getBotWallet('treasury');
      expect(tx.from).toBe(treasuryWallet?.publicAddress);
      expect(tx.to).toBe('USER_ADDRESS');
    });
  });

  describe('Transaction History', () => {
    beforeEach(async () => {
      await walletService.registerWallet('user123', 'ADDR_123', 'x402');
      await walletService.registerWallet('user456', 'ADDR_456', 'phantom');
    });

    it('should track user transaction history', async () => {
      await walletService.createTipTransaction('user123', 'user456', 5.00);
      await walletService.createWithdrawalTransaction('user123', 25.00);
      await walletService.createTipTransaction('user123', 'user456', 10.00);

      const history = walletService.getUserTransactions('user123');
      expect(history).toHaveLength(3);
    });

    it('should sort history by date (newest first)', async () => {
      await walletService.createTipTransaction('user123', 'user456', 5.00);
      await new Promise(resolve => setTimeout(resolve, 10));
      await walletService.createTipTransaction('user123', 'user456', 10.00);
      await new Promise(resolve => setTimeout(resolve, 10));
      await walletService.createTipTransaction('user123', 'user456', 15.00);

      const history = walletService.getUserTransactions('user123');
      expect(history[0].amountUSD).toBe(15.00);
      expect(history[1].amountUSD).toBe(10.00);
      expect(history[2].amountUSD).toBe(5.00);
    });

    it('should only show transactions for specific user', async () => {
      await walletService.createTipTransaction('user123', 'user456', 5.00);
      await walletService.createTipTransaction('user456', 'user123', 10.00);

      const user123History = walletService.getUserTransactions('user123');
      const user456History = walletService.getUserTransactions('user456');

      expect(user123History).toHaveLength(1);
      expect(user456History).toHaveLength(1);
      expect(user123History[0].amountUSD).toBe(5.00);
      expect(user456History[0].amountUSD).toBe(10.00);
    });
  });
});
