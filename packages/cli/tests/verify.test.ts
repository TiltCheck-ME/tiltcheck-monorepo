/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03 */

import { describe, expect, it } from 'vitest';
import { FairnessService } from '@tiltcheck/shared';
import {
  computeProvablyFair,
  formatProvablyFairText,
} from '../src/commands/verify.js';

describe('Provably Fair Verification (verify command)', () => {
  const sharedFairness = new FairnessService();

  it('matches @tiltcheck/shared FairnessService hash and float outputs exactly', async () => {
    const serverSeed = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
    const clientSeed = 'tiltcheck-client-seed-123';
    const nonce = 5;

    const result = computeProvablyFair(serverSeed, clientSeed, nonce);

    const expectedHash = await sharedFairness.verifyCasinoResult(serverSeed, clientSeed, nonce);
    const expectedFloat = sharedFairness.hashToFloat(expectedHash);
    const expectedDice = sharedFairness.getDiceResult(expectedFloat);
    const expectedCrash = sharedFairness.getLimboResult(expectedFloat, 0.01);

    expect(result.receipt.hmacSha256).toBe(expectedHash);
    expect(result.receipt.normalizedFloat).toBeCloseTo(expectedFloat, 10);
    expect(result.outcomes.dice).toBe(expectedDice);
    expect(result.outcomes.crashMultiplier).toBe(expectedCrash);
  });

  it('computes correct float in [0, 1) and derived game outcomes for nonce 0', () => {
    const result = computeProvablyFair('server_abc', 'client_xyz', 0);
    expect(result.status).toBe('verified');
    expect(result.inputs.nonce).toBe(0);
    expect(result.receipt.normalizedFloat).toBeGreaterThanOrEqual(0);
    expect(result.receipt.normalizedFloat).toBeLessThanOrEqual(1);
    expect(result.outcomes.dice).toBeGreaterThanOrEqual(0);
    expect(result.outcomes.dice).toBeLessThanOrEqual(100);
    expect(result.outcomes.crashMultiplier).toBeGreaterThanOrEqual(0.99);
  });

  it('handles high nonce counters without overflow or degradation', () => {
    const result = computeProvablyFair('server_abc', 'client_xyz', 1000000);
    expect(result.status).toBe('verified');
    expect(result.receipt.hmacSha256).toHaveLength(64);
  });

  it('respects custom house edge percentage', () => {
    const resultStandard = computeProvablyFair('seed1', 'seed2', 1, 1.0);
    const resultHighEdge = computeProvablyFair('seed1', 'seed2', 1, 5.0);

    expect(resultStandard.outcomes.houseEdgePercent).toBe(1.0);
    expect(resultHighEdge.outcomes.houseEdgePercent).toBe(5.0);
    expect(resultHighEdge.outcomes.crashMultiplier).toBeLessThanOrEqual(
      resultStandard.outcomes.crashMultiplier
    );
  });

  it('throws descriptive error on invalid house edge percentage', () => {
    expect(() => computeProvablyFair('s', 'c', 1, -1)).toThrow('House edge percentage must be a number');
    expect(() => computeProvablyFair('s', 'c', 1, 100)).toThrow('House edge percentage must be a number');
    expect(() => computeProvablyFair('s', 'c', 1, NaN)).toThrow('House edge percentage must be a number');
  });

  it('throws descriptive error when server seed is missing or empty', () => {
    expect(() => computeProvablyFair('', 'client', 1)).toThrow('Server seed is required.');
    expect(() => computeProvablyFair('   ', 'client', 1)).toThrow('Server seed is required.');
  });

  it('throws descriptive error when client seed is missing or empty', () => {
    expect(() => computeProvablyFair('server', '', 1)).toThrow('Client seed is required.');
    expect(() => computeProvablyFair('server', '   ', 1)).toThrow('Client seed is required.');
  });

  it('throws descriptive error when nonce is negative, non-integer, or unsafe integer', () => {
    expect(() => computeProvablyFair('server', 'client', -1)).toThrow(
      'Nonce must be a non-negative safe integer'
    );
    expect(() => computeProvablyFair('server', 'client', 1.5)).toThrow(
      'Nonce must be a non-negative safe integer'
    );
    expect(() => computeProvablyFair('server', 'client', Number.MAX_SAFE_INTEGER + 2)).toThrow(
      'Nonce must be a non-negative safe integer'
    );
  });

  it('formats text output cleanly without emojis and includes required brand footer', () => {
    const result = computeProvablyFair('server', 'client', 1);
    const text = formatProvablyFairText(result);

    // Brand Law: Zero emojis
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(text)).toBe(false);

    expect(text).toContain('TILTCHECK PROVABLY FAIR VERIFIER');
    expect(text).toContain('HMAC-SHA256');
    expect(text).toContain('Normalized Float');
    expect(text).toContain('Dice (0.00 - 100.00)');
    expect(text).toContain('Crash Multiplier');
    expect(text).toContain('NOTE: Single-bet verification confirms only mathematics');
    // Brand Law: Required footer
    expect(text).toContain('Made for Degens. By Degens.');
  });
});
