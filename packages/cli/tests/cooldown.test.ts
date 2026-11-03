/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03 */

import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import {
  canonicalizeJson,
  formatCooldownText,
  generateCooldownLock,
} from '../src/commands/cooldown.js';

describe('Voluntary Cooldown Lock (cooldown command)', () => {
  it('generates a cryptographically valid Ed25519 player-signed commitment', () => {
    const fixedTime = 1777000000000;
    const hours = 24;
    const lock = generateCooldownLock(hours, 'all-monitored-casinos', fixedTime);

    expect(lock.status).toBe('active-lock');
    expect(lock.verified).toBe(true);
    expect(lock.algorithm).toBe('Ed25519');
    expect(lock.durationHours).toBe(24);
    expect(lock.signerPublicKey).toHaveLength(64); // 32 bytes hex
    expect(lock.signature).toHaveLength(128); // 64 bytes hex
    expect(lock.commitmentHashSha256).toHaveLength(64);

    // Timestamps check: exactly 24 hours apart
    const createdMs = new Date(lock.createdAt).getTime();
    const lockedUntilMs = new Date(lock.lockedUntil).getTime();
    expect(lockedUntilMs - createdMs).toBe(24 * 3600 * 1000);

    // Independently verify signature using Node.js crypto
    const canonical = canonicalizeJson(lock.commitment as unknown as Record<string, unknown>);
    const rawPublicKey = Buffer.from(lock.signerPublicKey, 'hex');

    // Construct standard SPKI header for Ed25519 (OID 1.3.101.112)
    const spkiPrefix = Buffer.from('302a300506032b6570032100', 'hex');
    const spkiDer = Buffer.concat([spkiPrefix, rawPublicKey]);
    const pubKey = crypto.createPublicKey({ key: spkiDer, format: 'der', type: 'spki' });

    const independentVerification = crypto.verify(
      null,
      Buffer.from(canonical, 'utf8'),
      pubKey,
      Buffer.from(lock.signature, 'hex')
    );

    expect(independentVerification).toBe(true);
  });

  it('supports custom duration and scope', () => {
    const lock = generateCooldownLock(72, 'stake-us-only');
    expect(lock.durationHours).toBe(72);
    expect(lock.scope).toBe('stake-us-only');
    expect(lock.commitment.scope).toBe('stake-us-only');
    expect(lock.verified).toBe(true);
  });

  it('throws descriptive error on invalid hours or hours exceeding safe threshold', () => {
    expect(() => generateCooldownLock(0)).toThrow('between 1 and 87600');
    expect(() => generateCooldownLock(-24)).toThrow('between 1 and 87600');
    expect(() => generateCooldownLock(1.5)).toThrow('between 1 and 87600');
    expect(() => generateCooldownLock(100000)).toThrow('between 1 and 87600');
  });

  it('formats terminal text cleanly with zero emojis and non-custodial enforcement notice', () => {
    const lock = generateCooldownLock(48);
    const text = formatCooldownText(lock);

    // Brand Law: Zero emojis
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(text)).toBe(false);

    expect(text).toContain('TILTCHECK VOLUNTARY COOLDOWN LOCK');
    expect(text).toContain('Status: ACTIVE VOLUNTARY LOCK COMMITMENT');
    expect(text).toContain('Duration:     48 hours');
    expect(text).toContain('Signer Public Key:');
    expect(text).toContain('Ed25519 Signature:');
    expect(text).toContain('Verification:      VALID (Verified offline)');
    expect(text).toContain('ENFORCEMENT NOTICE:');
    expect(text).toContain('TiltCheck is non-custodial: your keys, your discipline.');
    // Brand Law: Required footer
    expect(text).toContain('Made for Degens. By Degens.');
  });
});
