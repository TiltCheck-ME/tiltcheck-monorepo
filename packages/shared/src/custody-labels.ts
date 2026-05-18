/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-18 */

/**
 * Short custody labels per flow — keep in sync with docs/legal/custody-matrix.md
 */
export type CustodyFlowId =
  | 'jtt_direct_tip'
  | 'jtt_credits_relay'
  | 'lockvault_timed'
  | 'wallet_action_lock'
  | 'autovault_userscript';

export const CUSTODY_MATRIX_DOC_PATH = '/docs/legal/custody-matrix.md';

export const CUSTODY_LABELS: Record<
  CustodyFlowId,
  { short: string; detail: string; custodyClass: 'non_custodial' | 'pooled_relay' | 'policy_advisory' | 'operator_session' }
> = {
  jtt_direct_tip: {
    short: 'Direct tip: non-custodial (you sign)',
    detail: 'Solana Pay / your wallet signs. TiltCheck does not hold keys.',
    custodyClass: 'non_custodial',
  },
  jtt_credits_relay: {
    short: 'Credits: pooled relay (bot wallet executes)',
    detail: 'Deposits credit the relay pool; payouts are executed by the operational bot wallet per credits policy.',
    custodyClass: 'pooled_relay',
  },
  lockvault_timed: {
    short: 'LockVault: advisory timer (you set the line)',
    detail: 'Harm-reduction lock on vault actions; not bank custody; early exit only where policy allows.',
    custodyClass: 'policy_advisory',
  },
  wallet_action_lock: {
    short: 'Wallet lock: server policy cooldown',
    detail: 'Blocks vault mutators for a window; timer-only mode disables early exit paths.',
    custodyClass: 'policy_advisory',
  },
  autovault_userscript: {
    short: 'AutoVault: your casino session (you control)',
    detail: 'Automation uses your session on the operator site; TiltCheck does not hold casino balances.',
    custodyClass: 'operator_session',
  },
};

export function getCustodyLabel(flowId: CustodyFlowId): string {
  return CUSTODY_LABELS[flowId]?.short ?? 'See custody matrix';
}

export function getCustodyDetail(flowId: CustodyFlowId): string {
  return CUSTODY_LABELS[flowId]?.detail ?? 'See docs/legal/custody-matrix.md';
}
