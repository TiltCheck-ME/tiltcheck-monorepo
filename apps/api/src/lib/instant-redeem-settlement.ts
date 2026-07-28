/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-28 */
/**
 * Instant Redeem settlement adapters.
 * Sandbox settles in-memory. Production uses processor stub unless live flag is on.
 * TiltCheck does not hold float in Phase 5.
 */

import type { SettlementRail } from './instant-redeem-production.js';

export type SettlementMode = 'sandbox' | 'processor_stub' | 'processor_live';

export type SettlementRequest = {
  redeemId: string;
  partnerId: string;
  partnerAppId: string;
  playerRef: string;
  casinoDomain: string;
  amountNet: number;
  currency: string;
  rail: SettlementRail;
  accountRef: string;
};

export type SettlementResult = {
  mode: SettlementMode;
  status: 'settled' | 'processor_pending' | 'rejected';
  processorRef: string | null;
  note: string;
};

export function resolveSettlementMode(partnerMode: string): SettlementMode {
  if (partnerMode !== 'production') {
    return 'sandbox';
  }
  if (process.env.INSTANT_REDEEM_LIVE_SETTLEMENT === 'true') {
    return 'processor_live';
  }
  return 'processor_stub';
}

/**
 * Execute settlement intent.
 * processor_live is reserved — Phase 5 keeps it rejected unless explicitly enabled,
 * and even then returns a structured pending handoff rather than moving funds in-repo.
 */
export async function executeSettlement(
  partnerMode: string,
  request: SettlementRequest,
): Promise<SettlementResult> {
  const mode = resolveSettlementMode(partnerMode);

  if (mode === 'sandbox') {
    return {
      mode,
      status: 'settled',
      processorRef: null,
      note: 'Sandbox settle only. No funds moved.',
    };
  }

  if (mode === 'processor_stub') {
    return {
      mode,
      status: 'processor_pending',
      processorRef: `proc_stub_${request.redeemId}`,
      note: 'Production grant approved, live settlement flag off. Processor stub recorded intent only — no funds moved.',
    };
  }

  // processor_live: orchestration handoff placeholder. Real processor HTTP clients land with LOI + secrets.
  return {
    mode,
    status: 'processor_pending',
    processorRef: `proc_live_${request.redeemId}`,
    note: 'Live settlement handoff placeholder. Wire processor credentials outside the monorepo secret boundary before claiming settled.',
  };
}
