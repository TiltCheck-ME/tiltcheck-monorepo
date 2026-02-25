/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Swap Engine Tests
 * Tests for Jupiter integration and token swap functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getSwapQuote,
  getTokenMint,
  getTokenInfo,
  isTokenSupported,
  getSupportedTokens,
  formatSwapQuote,
  SUPPORTED_TOKENS,
} from '../src/swap-engine.js';

describe('Swap Engine', () => {
  describe('Token Support', () => {
    it('should have SOL in supported tokens', () => {
      expect(isTokenSupported('SOL')).toBe(true);
      expect(isTokenSupported('sol')).toBe(true);
    });

    it('should have USDC in supported tokens', () => {
      expect(isTokenSupported('USDC')).toBe(true);
    });

    it('should have BONK in supported tokens', () => {
      expect(isTokenSupported('BONK')).toBe(true);
    });

    it('should return false for unsupported tokens', () => {
      expect(isTokenSupported('DOGECOIN')).toBe(false);
      expect(isTokenSupported('XRP')).toBe(false);
    });

    it('should get token mint address', () => {
      const solMint = getTokenMint('SOL');
      expect(solMint).toBe('So11111111111111111111111111111111111111112');
    });

    it('should get token info', () => {
      const usdcInfo = getTokenInfo('USDC');
      expect(usdcInfo).toBeDefined();
      expect(usdcInfo?.name).toBe('USD Coin');
      expect(usdcInfo?.decimals).toBe(6);
    });

    it('should return undefined for unknown token mint', () => {
      const mint = getTokenMint('UNKNOWN');
      expect(mint).toBeUndefined();
    });

    it('should list all supported tokens', () => {
      const tokens = getSupportedTokens();
      expect(tokens).toContain('SOL');
      expect(tokens).toContain('USDC');
      expect(tokens).toContain('BONK');
      expect(tokens).toContain('JUP');
      expect(tokens.length).toBeGreaterThan(5);
    });
  });

  describe('Swap Quote', () => {
    it('should fail for unsupported input token', async () => {
      const result = await getSwapQuote('user123', 'DOGECOIN', 'SOL', 1);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported input token');
    });

    it('should fail for unsupported output token', async () => {
      const result = await getSwapQuote('user123', 'SOL', 'DOGECOIN', 1);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported output token');
    });

    it('should fail when swapping same token', async () => {
      const result = await getSwapQuote('user123', 'SOL', 'SOL', 1);
      expect(result.success).toBe(false);
      expect(result.error).toContain('must be different');
    });
  });

  describe('Format Quote', () => {
    it('should format swap quote for display', () => {
      const formatted = formatSwapQuote('SOL', 'USDC', 1, 100, 0.5);
      expect(formatted).toContain('SOL');
      expect(formatted).toContain('USDC');
      expect(formatted).toContain('Rate');
      expect(formatted).toContain('Price Impact');
    });

    it('should show low price impact with green emoji', () => {
      const formatted = formatSwapQuote('SOL', 'USDC', 1, 100, 0.1);
      expect(formatted).toContain('✅');
    });

    it('should show medium price impact with warning emoji', () => {
      const formatted = formatSwapQuote('SOL', 'USDC', 1, 100, 2.5);
      expect(formatted).toContain('⚠️');
    });

    it('should show high price impact with red emoji', () => {
      const formatted = formatSwapQuote('SOL', 'USDC', 1, 100, 5);
      expect(formatted).toContain('🔴');
    });
  });

  describe('Token Configuration', () => {
    it('should have correct decimals for SOL', () => {
      expect(SUPPORTED_TOKENS['SOL'].decimals).toBe(9);
    });

    it('should have correct decimals for USDC', () => {
      expect(SUPPORTED_TOKENS['USDC'].decimals).toBe(6);
    });

    it('should have correct decimals for WBTC', () => {
      expect(SUPPORTED_TOKENS['WBTC'].decimals).toBe(8);
    });
  });
});
