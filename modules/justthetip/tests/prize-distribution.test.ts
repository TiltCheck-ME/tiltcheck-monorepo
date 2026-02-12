import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  createPrizeDistribution, 
  getPrizeDistribution, 
  getHostDistributions, 
  isAdmin,
  cleanupExpiredDistributions,
  clearPrizeDistributions
} from '../src/prize-distribution';
import { registerExternalWallet, clearWallets } from '../src/wallet-manager';
import { eventRouter } from '@tiltcheck/event-router';
import { Connection } from '@solana/web3.js';

// Mock the Connection class
vi.mock('@solana/web3.js', async () => {
  const actual = await vi.importActual('@solana/web3.js');
  return {
    ...actual as any,
    Connection: vi.fn().mockImplementation(function() {
      return {
        getLatestBlockhash: vi.fn().mockResolvedValue({
          blockhash: 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi', // Valid base58
          lastValidBlockHeight: 12345678,
        }),
        confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
      };
    }),
  };
});

// Valid Solana test addresses (real base58 public keys for test system program and similar)
const TEST_HOST_ADDRESS = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'; // Token program - valid pubkey
const TEST_RECIPIENT1_ADDRESS = 'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo'; // Memo program - valid pubkey  
const TEST_RECIPIENT2_ADDRESS = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'; // AToken program - valid pubkey

describe('Prize Distribution', () => {
  let mockConnection: Connection;

  beforeEach(() => {
    // Clear all state between tests
    clearWallets();
    clearPrizeDistributions();
    eventRouter.clearHistory();
    
    // Create mock connection
    mockConnection = new Connection('https://api.mainnet-beta.solana.com');
  });

  describe('isAdmin', () => {
    it('should return true when no admin list is configured (dev mode)', () => {
      // When PRIZE_ADMIN_USER_IDS is empty, all users are admins
      expect(isAdmin('anyUser123')).toBe(true);
    });
  });

  describe('createPrizeDistribution', () => {
    it('should fail if host has no wallet', async () => {
      const result = await createPrizeDistribution(
        mockConnection,
        'hostWithoutWallet',
        ['recipient1', 'recipient2'],
        1.0,
        'trivia'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Host does not have a registered wallet');
    });

    it('should fail if no recipients have wallets', async () => {
      // Register host wallet
      await registerExternalWallet('hostUser', TEST_HOST_ADDRESS);

      const result = await createPrizeDistribution(
        mockConnection,
        'hostUser',
        ['recipient1', 'recipient2'],
        1.0,
        'trivia'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No recipients have registered wallets');
      expect(result.skippedRecipients).toEqual(['recipient1', 'recipient2']);
    });

    it('should create distribution with valid host and recipients', async () => {
      // Register wallets with valid addresses
      await registerExternalWallet('hostUser', TEST_HOST_ADDRESS);
      await registerExternalWallet('recipient1', TEST_RECIPIENT1_ADDRESS);
      await registerExternalWallet('recipient2', TEST_RECIPIENT2_ADDRESS);

      const result = await createPrizeDistribution(
        mockConnection,
        'hostUser',
        ['recipient1', 'recipient2'],
        1.0,
        'trivia'
      );

      expect(result.success).toBe(true);
      expect(result.distribution).toBeDefined();
      expect(result.distribution?.hostId).toBe('hostUser');
      expect(result.distribution?.totalPrize).toBe(1.0);
      expect(result.distribution?.recipientIds).toHaveLength(2);
      expect(result.distribution?.prizePerRecipient).toBe(0.5);
      expect(result.distribution?.status).toBe('ready');
      expect(result.paymentUrl).toBeDefined();
      expect(result.paymentUrl).toContain('solana:');

      // Check event was published
      const events = eventRouter.getHistory();
      expect(events.some(e => e.type === 'prize.created')).toBe(true);
    });

    it('should skip recipients without wallets and report them', async () => {
      // Register host and only one recipient
      await registerExternalWallet('hostUser', TEST_HOST_ADDRESS);
      await registerExternalWallet('recipient1', TEST_RECIPIENT1_ADDRESS);

      const result = await createPrizeDistribution(
        mockConnection,
        'hostUser',
        ['recipient1', 'recipient2', 'recipient3'],
        1.5,
        'airdrop'
      );

      expect(result.success).toBe(true);
      expect(result.distribution?.recipientIds).toHaveLength(1);
      expect(result.distribution?.prizePerRecipient).toBe(1.5); // Full prize to single recipient
      expect(result.skippedRecipients).toEqual(['recipient2', 'recipient3']);
    });

    it('should set correct context type', async () => {
      await registerExternalWallet('hostUser', TEST_HOST_ADDRESS);
      await registerExternalWallet('recipient1', TEST_RECIPIENT1_ADDRESS);

      const result = await createPrizeDistribution(
        mockConnection,
        'hostUser',
        ['recipient1'],
        0.5,
        'custom'
      );

      expect(result.success).toBe(true);
      expect(result.distribution?.context).toBe('custom');
    });
  });

  describe('getPrizeDistribution', () => {
    it('should return undefined for non-existent distribution', () => {
      const result = getPrizeDistribution('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('should return distribution by ID', async () => {
      await registerExternalWallet('hostUser', TEST_HOST_ADDRESS);
      await registerExternalWallet('recipient1', TEST_RECIPIENT1_ADDRESS);

      const createResult = await createPrizeDistribution(
        mockConnection,
        'hostUser',
        ['recipient1'],
        0.5,
        'trivia'
      );

      expect(createResult.success).toBe(true);
      expect(createResult.distribution).toBeDefined();

      const distribution = getPrizeDistribution(createResult.distribution!.id);
      expect(distribution).toBeDefined();
      expect(distribution?.id).toBe(createResult.distribution!.id);
    });
  });

  describe('getHostDistributions', () => {
    it('should return empty array for host with no distributions', () => {
      const result = getHostDistributions('unknownHost');
      expect(result).toEqual([]);
    });

    it('should return all distributions for a host', async () => {
      await registerExternalWallet('hostUser', TEST_HOST_ADDRESS);
      await registerExternalWallet('recipient1', TEST_RECIPIENT1_ADDRESS);

      // Create multiple distributions
      const result1 = await createPrizeDistribution(mockConnection, 'hostUser', ['recipient1'], 0.5, 'trivia');
      const result2 = await createPrizeDistribution(mockConnection, 'hostUser', ['recipient1'], 0.3, 'airdrop');

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const distributions = getHostDistributions('hostUser');
      expect(distributions).toHaveLength(2);
      expect(distributions.every(d => d.hostId === 'hostUser')).toBe(true);
    });

    it('should sort distributions by creation time (newest first)', async () => {
      await registerExternalWallet('hostUser', TEST_HOST_ADDRESS);
      await registerExternalWallet('recipient1', TEST_RECIPIENT1_ADDRESS);

      await createPrizeDistribution(mockConnection, 'hostUser', ['recipient1'], 0.5, 'trivia');
      await createPrizeDistribution(mockConnection, 'hostUser', ['recipient1'], 0.3, 'airdrop');

      const distributions = getHostDistributions('hostUser');
      expect(distributions.length).toBeGreaterThan(0);
      if (distributions.length >= 2) {
        expect(distributions[0].createdAt).toBeGreaterThanOrEqual(distributions[1].createdAt);
      }
    });
  });

  describe('cleanupExpiredDistributions', () => {
    it('should not affect fresh distributions', async () => {
      await registerExternalWallet('hostUser', TEST_HOST_ADDRESS);
      await registerExternalWallet('recipient1', TEST_RECIPIENT1_ADDRESS);

      const createResult = await createPrizeDistribution(mockConnection, 'hostUser', ['recipient1'], 0.5, 'trivia');
      expect(createResult.success).toBe(true);

      const beforeCount = getHostDistributions('hostUser').length;
      const cleaned = cleanupExpiredDistributions();
      const afterCount = getHostDistributions('hostUser').length;

      expect(cleaned).toBe(0);
      expect(afterCount).toBe(beforeCount);
    });
  });
});
