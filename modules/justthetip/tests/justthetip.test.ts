/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { JustTheTipModule } from '../src/index.js';
import { eventRouter } from '@tiltcheck/event-router';

describe('JustTheTipModule', () => {
  let justthetip: JustTheTipModule;

  beforeEach(() => {
    justthetip = new JustTheTipModule();
    justthetip.clearState();
    eventRouter.clearHistory();
  });

  describe('Tipping Flow', () => {
    it('should initiate a tip with valid amount', async () => {
      // Register sender wallet first
      await justthetip.registerWallet('user1', 'sender123', 'x402');

      const tip = await justthetip.initiateTip('user1', 'user2', 10.00, 'USD');
      
      expect(tip.senderId).toBe('user1');
      expect(tip.recipientId).toBe('user2');
      expect(tip.usdAmount).toBe(10.00);
      expect(tip.status).toBe('pending');
      expect(tip.reference).toBeDefined();
      
      const events = eventRouter.getHistory();
      expect(events.some((e: any) => e.type === 'tip.initiated')).toBe(true);
    });

    it('should reject tip below minimum amount', async () => {
      await justthetip.registerWallet('user1', 'sender123', 'x402');
      
      await expect(
        justthetip.initiateTip('user1', 'user2', 0.05, 'USD')
      ).rejects.toThrow('❌ Amount must be between $0.10 and $100.00 USD');
    });

    it('should reject tip above maximum amount', async () => {
      await justthetip.registerWallet('user1', 'sender123', 'x402');
      
      await expect(
        justthetip.initiateTip('user1', 'user2', 150.00, 'USD')
      ).rejects.toThrow('❌ Amount must be between $0.10 and $100.00 USD');
    });

    it('should reject tip from unregistered sender', async () => {
      await expect(
        justthetip.initiateTip('unregistered', 'user2', 10.00, 'USD')
      ).rejects.toThrow('❌ Please register your wallet first using `/register-magic`');
    });

    it('should store tip as pending if recipient has no wallet', async () => {
      await justthetip.registerWallet('user1', 'sender123', 'x402');
      
      const tip = await justthetip.initiateTip('user1', 'user2', 10.00, 'USD');
      
      expect(tip.recipientWallet).toBeUndefined();
      const pending = justthetip.getPendingTipsForUser('user2');
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(tip.id);
    });

    it('should auto-assign recipient wallet if already registered', async () => {
      await justthetip.registerWallet('user1', 'sender123', 'x402');
      await justthetip.registerWallet('user2', 'recipient456', 'magic');
      
      const tip = await justthetip.initiateTip('user1', 'user2', 10.00, 'USD');
      
      expect(tip.recipientWallet).toBe('recipient456');
    });
  });

  describe('Wallet Registration', () => {
    it('should register wallet with x402', async () => {
      const wallet = await justthetip.registerWallet('user1', 'wallet123', 'x402');
      
      expect(wallet.userId).toBe('user1');
      expect(wallet.address).toBe('wallet123');
      expect(wallet.type).toBe('x402');
      expect(wallet.registeredAt).toBeDefined();
      
      const events = eventRouter.getHistory();
      expect(events.some((e: any) => e.type === 'wallet.registered')).toBe(true);
    });

    it('should register wallet with Magic Link', async () => {
      const wallet = await justthetip.registerWallet('user2', 'magic456', 'magic');
      
      expect(wallet.type).toBe('magic');
    });

    it('should process pending tips after wallet registration', async () => {
      await justthetip.registerWallet('sender', 'senderWallet', 'x402');
      
      // Create pending tip for unregistered recipient
      await justthetip.initiateTip('sender', 'recipient', 10.00, 'USD');
      
      let pending = justthetip.getPendingTipsForUser('recipient');
      expect(pending).toHaveLength(1);
      
      // Register recipient wallet
      await justthetip.registerWallet('recipient', 'recipientWallet', 'phantom');
      
      // Pending tips should be resolved
      pending = justthetip.getPendingTipsForUser('recipient');
      expect(pending).toHaveLength(0);
      
      const events = eventRouter.getHistory();
      expect(events.some((e: any) => e.type === 'tip.pending.resolved')).toBe(true);
    });
  });

  describe('Tip Completion', () => {
    it('should complete tip with transaction signature', async () => {
      await justthetip.registerWallet('user1', 'sender123', 'x402');
      await justthetip.registerWallet('user2', 'recipient456', 'magic');
      
      const tip = await justthetip.initiateTip('user1', 'user2', 10.00, 'USD');
      
      const completed = await justthetip.completeTip(tip.id, 'signature123abc');
      
      expect(completed.status).toBe('completed');
      expect(completed.signature).toBe('signature123abc');
      expect(completed.completedAt).toBeDefined();
      
      const events = eventRouter.getHistory();
      expect(events.some((e: any) => e.type === 'tip.completed')).toBe(true);
    });
  });

  describe('Tip Queries', () => {
    it('should get all tips for user (sent and received)', async () => {
      await justthetip.registerWallet('alice', 'alice123', 'x402');
      await justthetip.registerWallet('bob', 'bob456', 'magic');
      
      await justthetip.initiateTip('alice', 'bob', 5.00, 'USD');
      await justthetip.initiateTip('bob', 'alice', 10.00, 'USD');
      
      const aliceTips = justthetip.getTipsForUser('alice');
      expect(aliceTips).toHaveLength(2);
    });
  });

  describe('Solana Pay URL Generation', () => {
    it('should generate valid Solana Pay URL', () => {
      const url = justthetip.generateSolanaPayURL(
        'recipientAddress123',
        0.05,
        'ref123',
        'Tip via JustTheTip'
      );
      
      expect(url).toContain('solana:recipientAddress123');
      expect(url).toContain('amount=0.05');
      expect(url).toContain('reference=ref123');
    });
  });

  describe('Wallet Management', () => {
    it('prevents duplicate wallet registration', async () => {
      // Register first wallet
      const wallet1 = await justthetip.registerWallet('user789', 'wallet789abc', 'phantom');
      expect(wallet1.address).toBe('wallet789abc');

      // Try to register second wallet - should fail
      await expect(
        justthetip.registerWallet('user789', 'wallet789xyz', 'magic')
      ).rejects.toThrow('already have a wallet registered');

      // Verify first wallet still active
      const userWallet = justthetip.getWallet('user789');
      expect(userWallet?.address).toBe('wallet789abc');
    });

    it('disconnects wallet successfully with no pending tips', async () => {
      // Register wallet
      await justthetip.registerWallet('user101', 'wallet101abc', 'phantom');
      expect(justthetip.hasWallet('user101')).toBe(true);

      // Disconnect wallet
      const result = await justthetip.disconnectWallet('user101');

      expect(result.success).toBe(true);
      expect(result.pendingTipsCount).toBe(0);
      expect(result.wallet?.address).toBe('wallet101abc');
      expect(justthetip.hasWallet('user101')).toBe(false);
    });

    it('warns about pending tips when disconnecting wallet', async () => {
      // Register sender wallet
      await justthetip.registerWallet('sender202', 'walletSender202', 'phantom');

      // Register recipient wallet
      await justthetip.registerWallet('recipient303', 'walletRecipient303', 'magic');

      // Create pending tip to recipient
      await justthetip.initiateTip('sender202', 'recipient303', 5.0, 'USD');
      
      // Disconnect recipient wallet (has pending tip)
      const result = await justthetip.disconnectWallet('recipient303');

      expect(result.success).toBe(true);
      expect(result.pendingTipsCount).toBe(1);
      expect(result.message).toContain('⚠️');
      expect(result.message).toContain('1 pending tip');
      expect(justthetip.hasWallet('recipient303')).toBe(false);
    });

    it('allows re-registration after disconnect', async () => {
      // Register wallet
      await justthetip.registerWallet('user404', 'wallet404old', 'phantom');

      // Disconnect
      await justthetip.disconnectWallet('user404');
      expect(justthetip.hasWallet('user404')).toBe(false);

      // Re-register with new wallet
      const newWallet = await justthetip.registerWallet('user404', 'wallet404new', 'magic');
      expect(newWallet.address).toBe('wallet404new');
      expect(newWallet.type).toBe('magic');
      expect(justthetip.hasWallet('user404')).toBe(true);
    });

    it('fails to disconnect non-existent wallet', async () => {
      const result = await justthetip.disconnectWallet('noWalletUser');

      expect(result.success).toBe(false);
      expect(result.message).toContain("don't have a wallet");
    });
  });
});