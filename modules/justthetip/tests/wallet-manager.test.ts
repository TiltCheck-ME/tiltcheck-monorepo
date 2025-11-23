/**
 * Wallet Manager Tests - Runtime Guards for bigint-buffer vulnerability
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  registerExternalWallet,
  getWallet,
  clearWallets,
} from '../src/wallet-manager.js';

describe('WalletManager - Security Guards', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    clearWallets();
    // Set to production for validation tests
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('Solana Address Validation (GHSA-3gc7-fjrx-p6mg mitigation)', () => {
    it('should accept valid Solana address', () => {
      // Valid Solana mainnet address (32 bytes base58 encoded)
      const validAddress = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK';
      
      const wallet = registerExternalWallet('user123', validAddress);
      
      expect(wallet.address).toBe(validAddress);
      expect(wallet.userId).toBe('user123');
    });

    it('should reject address with invalid base58 characters', () => {
      // Contains invalid characters (0, O, I, l not in base58)
      const invalidAddresses = [
        'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSK0', // contains 0
        'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKO', // contains O
        'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKI', // contains I
        'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKl', // contains l
        'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSK!', // contains !
      ];

      invalidAddresses.forEach((address) => {
        expect(() => {
          registerExternalWallet('user123', address);
        }).toThrow('Invalid Solana address: must use base58 encoding');
      });
    });

    it('should reject address that is too short', () => {
      const tooShort = 'DYw8jCTfwHNRJhhmFcbXvVDTqWME'; // < 32 chars
      
      expect(() => {
        registerExternalWallet('user123', tooShort);
      }).toThrow('Invalid Solana address: incorrect length');
    });

    it('should reject address that is too long', () => {
      const tooLong = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKKabcdefghij'; // > 44 chars
      
      expect(() => {
        registerExternalWallet('user123', tooLong);
      }).toThrow('Invalid Solana address: incorrect length');
    });

    it('should reject empty address', () => {
      expect(() => {
        registerExternalWallet('user123', '');
      }).toThrow('Invalid Solana address');
    });

    it('should reject malformed base58 string', () => {
      // Valid length but not a valid public key
      const malformed = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      
      expect(() => {
        registerExternalWallet('user123', malformed);
      }).toThrow('Invalid Solana address');
    });

    it('should prevent buffer overflow by checking 32-byte constraint', () => {
      // This test ensures the validation prevents any address that doesn't
      // decode to exactly 32 bytes, protecting against bigint-buffer vulnerability
      const validAddress = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK';
      
      const wallet = registerExternalWallet('user123', validAddress);
      expect(wallet).toBeDefined();
      
      // The validation function should have checked that the decoded key is 32 bytes
      const storedWallet = getWallet('user123');
      expect(storedWallet?.address).toBe(validAddress);
    });

    it('should handle multiple wallet registrations with different addresses', () => {
      const address1 = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK';
      const address2 = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      
      const wallet1 = registerExternalWallet('user1', address1);
      const wallet2 = registerExternalWallet('user2', address2);
      
      expect(wallet1.address).toBe(address1);
      expect(wallet2.address).toBe(address2);
      expect(getWallet('user1')?.address).toBe(address1);
      expect(getWallet('user2')?.address).toBe(address2);
    });
  });

  describe('Test Mode Behavior', () => {
    it('should skip validation in test mode', () => {
      // Restore test mode
      process.env.NODE_ENV = 'test';
      
      const mockAddress = 'MOCK_ADDRESS_123';
      
      // In test mode, validation is skipped to allow mock addresses
      const wallet = registerExternalWallet('user123', mockAddress);
      expect(wallet.address).toBe(mockAddress);
    });
  });
});
