// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-04

import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import {
  computeHmacSha256,
  computeProvablyFair,
  computeSha256,
  deriveMines,
  derivePlinko,
  deriveRoulette,
  PROVABLY_FAIR_PRESETS,
  verifyServerSeedHash,
} from './provably-fair';

describe('Provably Fair Engine (provably-fair.ts)', () => {
  it('matches Node crypto.createHash SHA-256 across arbitrary inputs', () => {
    const testCases = [
      '',
      'a',
      'tiltcheck',
      'd01247ff421a9fbdf4ee920fb62d22a7f5a11c8cb404c278072d62ee5d7a6e13',
      'The quick brown fox jumps over the lazy dog',
      'Special symbols !@#$%^&*()_+{}[]:;<>?,./',
    ];

    for (const text of testCases) {
      const pureJs = computeSha256(text);
      const nodeCrypto = crypto.createHash('sha256').update(text).digest('hex');
      expect(pureJs).toBe(nodeCrypto);
    }
  });

  it('matches Node crypto.createHmac HMAC-SHA256 across keys and messages', () => {
    const testPairs = [
      { key: 'secret_key', msg: 'message_data' },
      { key: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9', msg: 'tiltcheck-client-seed-123:5' },
      { key: 'very_long_key_exceeding_block_size_64_bytes_01234567890123456789012345678901234567890123456789', msg: 'short_msg' },
      { key: 'short', msg: 'a'.repeat(200) },
    ];

    for (const { key, msg } of testPairs) {
      const pureJs = computeHmacSha256(key, msg);
      const nodeCrypto = crypto.createHmac('sha256', key).update(msg).digest('hex');
      expect(pureJs).toBe(nodeCrypto);
    }
  });

  it('computes exact hash and game outcomes matching packages/cli standard', () => {
    const serverSeed = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
    const clientSeed = 'tiltcheck-client-seed-123';
    const nonce = 5;

    const result = computeProvablyFair(serverSeed, clientSeed, nonce);

    // Exact expected hash from standard HMAC-SHA256
    expect(result.receipt.hmacSha256).toBe('da45a536f1388e9ab0214ea8d1697c9db53833cd7708ad1c2c3f4eb36d3229f7');
    expect(result.receipt.leadingBytesHex).toBe('da45a536');
    expect(result.receipt.leadingBytesInt).toBe(3661997366);
    expect(result.receipt.normalizedFloat).toBeCloseTo(0.8526252039830725, 8);
    expect(result.outcomes.dice).toBe(85.27);
    expect(result.outcomes.crashMultiplier).toBe(6.71);
  });

  it('verifies server seed pre-commitment correctly for matching and mismatching hashes', () => {
    const serverSeed = 'd01247ff421a9fbdf4ee920fb62d22a7f5a11c8cb404c278072d62ee5d7a6e13';
    const validHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const invalidHash = '0000000000000000000000000000000000000000000000000000000000000000';

    const matchCheck = verifyServerSeedHash(serverSeed, validHash);
    expect(matchCheck.status).toBe('match');
    expect(matchCheck.isMatch).toBe(true);

    const mismatchCheck = verifyServerSeedHash(serverSeed, invalidHash);
    expect(mismatchCheck.status).toBe('mismatch');
    expect(mismatchCheck.isMatch).toBe(false);

    const emptyCheck = verifyServerSeedHash(serverSeed, '');
    expect(emptyCheck.status).toBe('not_provided');
    expect(emptyCheck.isMatch).toBe(false);
  });

  it('correctly derives European Roulette pocket, color, and parity', () => {
    // 0.0 -> pocket 0, green
    const zero = deriveRoulette(0.0);
    expect(zero.pocket).toBe(0);
    expect(zero.color).toBe('green');
    expect(zero.isEven).toBe(false);

    // 0.85262520 -> pocket 31, black, odd, high
    const outcome = deriveRoulette(0.8526252);
    expect(outcome.pocket).toBe(31);
    expect(outcome.color).toBe('black');
    expect(outcome.isEven).toBe(false);
    expect(outcome.isHigh).toBe(true);
  });

  it('correctly derives deterministic Plinko path and landing slot', () => {
    const hash = 'da45a536f1388e9ab0214ea8d1697c9db53833cd7708ad1c2c3f4eb36d3229f7';
    const plinko = derivePlinko(hash, 12);

    expect(plinko.rows).toBe(12);
    expect(plinko.directions).toHaveLength(12);
    expect(plinko.landingSlot).toBeGreaterThanOrEqual(0);
    expect(plinko.landingSlot).toBeLessThanOrEqual(12);
    expect(plinko.landingSlot).toBe(plinko.directions.filter((d) => d === 'R').length);
  });

  it('correctly derives deterministic Mines positions', () => {
    const hash = 'da45a536f1388e9ab0214ea8d1697c9db53833cd7708ad1c2c3f4eb36d3229f7';
    const mines = deriveMines(hash, 3);

    expect(mines.mineCount).toBe(3);
    expect(mines.minePositions).toHaveLength(3);
    expect(mines.safePositions).toHaveLength(22);
    // Every position is between 0 and 24
    for (const p of mines.minePositions) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(24);
    }
    // No intersection between mines and safe
    const intersection = mines.minePositions.filter((p) => mines.safePositions.includes(p));
    expect(intersection).toHaveLength(0);
  });

  it('validates all built-in presets for Stake, Roobet, and BC.Game', () => {
    for (const preset of PROVABLY_FAIR_PRESETS) {
      const result = computeProvablyFair(preset.serverSeed, preset.clientSeed, preset.nonce, {
        committedHash: preset.committedHash,
        houseEdgePercent: preset.houseEdgePercent,
      });

      expect(result.status).toBe('verified');
      expect(result.preCommitment.isMatch).toBe(true);
      expect(result.receipt.hmacSha256).toHaveLength(64);
      expect(result.receipt.normalizedFloat).toBeGreaterThanOrEqual(0);
      expect(result.receipt.normalizedFloat).toBeLessThanOrEqual(1);
      expect(result.outcomes.dice).toBeGreaterThanOrEqual(0);
      expect(result.outcomes.dice).toBeLessThanOrEqual(100);
      expect(result.outcomes.crashMultiplier).toBeGreaterThanOrEqual(1.0);
    }
  });

  it('throws descriptive error on missing seeds or invalid nonce', () => {
    expect(() => computeProvablyFair('', 'client', 1)).toThrow('Server seed is required.');
    expect(() => computeProvablyFair('server', '', 1)).toThrow('Client seed is required.');
    expect(() => computeProvablyFair('server', 'client', -1)).toThrow('Nonce must be a non-negative safe integer');
    expect(() => computeProvablyFair('server', 'client', 1.5)).toThrow('Nonce must be a non-negative safe integer');
    expect(() => computeProvablyFair('server', 'client', 0, { houseEdgePercent: -1 })).toThrow('House edge percentage');
  });

  it('contains zero emojis across presets, descriptions, and outputs', () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    for (const preset of PROVABLY_FAIR_PRESETS) {
      expect(emojiRegex.test(preset.name)).toBe(false);
      expect(emojiRegex.test(preset.description)).toBe(false);
      expect(emojiRegex.test(preset.tag)).toBe(false);
    }

    const result = computeProvablyFair('server', 'client', 1);
    expect(emojiRegex.test(result.disclaimer)).toBe(false);
    expect(emojiRegex.test(result.standard)).toBe(false);
  });
});
