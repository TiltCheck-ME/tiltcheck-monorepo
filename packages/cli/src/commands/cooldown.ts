/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03 */

import { Command } from 'commander';
import crypto from 'node:crypto';

export interface CooldownCommitmentPayload {
  standard: string;
  action: string;
  createdAt: string;
  durationHours: number;
  lockedUntil: string;
  scope: string;
  policy: string;
  signerPublicKey: string;
}

export interface CooldownLockResult {
  status: 'active-lock';
  verified: boolean;
  algorithm: 'Ed25519';
  durationHours: number;
  createdAt: string;
  lockedUntil: string;
  scope: string;
  signerPublicKey: string;
  commitmentHashSha256: string;
  signature: string;
  commitment: CooldownCommitmentPayload;
  notice: string;
}

/**
 * Creates a deterministic canonical JSON string for commitment signing.
 */
export function canonicalizeJson(obj: Record<string, unknown>): string {
  const sortedKeys = Object.keys(obj).sort();
  const sortedObj: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    sortedObj[k] = obj[k];
  }
  return JSON.stringify(sortedObj);
}

/**
 * Generates an offline Ed25519 voluntary cooldown lock commitment.
 */
export function generateCooldownLock(
  hours: number,
  scope: string = 'all-monitored-casinos',
  fixedTimestamp?: number
): CooldownLockResult {
  if (!Number.isInteger(hours) || hours <= 0 || hours > 87600) {
    throw new Error('Cooldown hours must be a positive integer between 1 and 87600 (max 10 years).');
  }

  const effectiveScope = scope && scope.trim() ? scope.trim() : 'all-monitored-casinos';

  // Generate Ed25519 keypair offline in memory
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

  // Extract raw 32-byte Ed25519 public key
  const spkiDer = publicKey.export({ type: 'spki', format: 'der' });
  const rawPublicKey = spkiDer.subarray(-32);
  const signerPublicKey = rawPublicKey.toString('hex');

  const nowMs = fixedTimestamp ?? Date.now();
  const createdAt = new Date(nowMs).toISOString();
  const lockedUntil = new Date(nowMs + hours * 3600 * 1000).toISOString();

  const commitment: CooldownCommitmentPayload = {
    standard: 'tiltcheck-cooldown-v1',
    action: 'voluntary-self-exclusion-commitment',
    createdAt,
    durationHours: hours,
    lockedUntil,
    scope: effectiveScope,
    policy: 'non-custodial-voluntary-lock',
    signerPublicKey,
  };

  const canonicalPayload = canonicalizeJson(commitment as unknown as Record<string, unknown>);
  const payloadBuffer = Buffer.from(canonicalPayload, 'utf8');

  // Sign payload with Ed25519 private key
  const signatureBuffer = crypto.sign(null, payloadBuffer, privateKey);
  const signature = signatureBuffer.toString('hex');

  // Hash the commitment payload for quick identity reference
  const commitmentHashSha256 = crypto
    .createHash('sha256')
    .update(payloadBuffer)
    .digest('hex');

  // Verify signature locally offline
  const verified = crypto.verify(null, payloadBuffer, publicKey, signatureBuffer);

  return {
    status: 'active-lock',
    verified,
    algorithm: 'Ed25519',
    durationHours: hours,
    createdAt,
    lockedUntil,
    scope: effectiveScope,
    signerPublicKey,
    commitmentHashSha256,
    signature,
    commitment,
    notice:
      'Non-custodial voluntary lock commitment. Keys generated offline. Import token into TiltCheck client extension to lock deposit flows.',
  };
}

export function formatCooldownText(result: CooldownLockResult): string {
  const lines = [
    '======================================================================',
    'TILTCHECK VOLUNTARY COOLDOWN LOCK',
    `Status: ACTIVE VOLUNTARY LOCK COMMITMENT`,
    '======================================================================',
    '',
    'LOCK COMMITMENT DETAILS:',
    `  Duration:     ${result.durationHours} hours`,
    `  Created At:   ${result.createdAt}`,
    `  Locked Until: ${result.lockedUntil} (UTC)`,
    `  Scope:        ${result.scope}`,
    '',
    'CRYPTOGRAPHIC PROOF (Ed25519):',
    `  Signer Public Key: ${result.signerPublicKey}`,
    `  Commitment SHA256: ${result.commitmentHashSha256}`,
    `  Ed25519 Signature: ${result.signature}`,
    `  Verification:      ${result.verified ? 'VALID (Verified offline)' : 'FAILED'}`,
    '',
    'CANONICAL COMMITMENT PAYLOAD (JSON):',
    JSON.stringify(result.commitment, null, 2),
    '',
    'ENFORCEMENT NOTICE:',
    '  This is a player-signed voluntary commitment generated offline.',
    '  TiltCheck is non-custodial: your keys, your discipline.',
    '  Import this commitment payload into your TiltCheck browser extension',
    '  to lock deposit triggers and initiate spin-brake intervention.',
    '======================================================================',
    'Made for Degens. By Degens.',
  ];

  return lines.join('\n');
}

export const cooldownCommand = new Command('cooldown')
  .description('Offline Ed25519 player-signed voluntary lock generation')
  .argument('<hours>', 'Cooldown duration in hours (e.g. 24, 72, 168)')
  .option('-j, --json', 'Output lock commitment as raw JSON')
  .option('-s, --scope <scope>', 'Lock scope (default: all-monitored-casinos)', 'all-monitored-casinos')
  .action((hoursStr: string, options: { json?: boolean; scope: string }) => {
    try {
      const hours = parseInt(hoursStr, 10);
      if (isNaN(hours) || String(hours) !== hoursStr.trim() || hours <= 0 || hours > 87600) {
        throw new Error(`Invalid duration "${hoursStr}". Duration must be a positive integer between 1 and 87600 (max 10 years).`);
      }

      const result = generateCooldownLock(hours, options.scope);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatCooldownText(result));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (options.json) {
        console.error(JSON.stringify({ error: msg, status: 'failed' }, null, 2));
      } else {
        console.error(`[tiltcheck cooldown error] ${msg}`);
      }
      process.exit(1);
    }
  });
