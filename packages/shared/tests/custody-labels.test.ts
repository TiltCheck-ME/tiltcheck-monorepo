/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-18 */

import { describe, expect, it } from 'vitest';
import {
  CUSTODY_LABELS,
  getCustodyDetail,
  getCustodyLabel,
  type CustodyFlowId,
} from '../src/custody-labels.js';

const FLOW_IDS: CustodyFlowId[] = [
  'jtt_direct_tip',
  'jtt_credits_relay',
  'lockvault_timed',
  'wallet_action_lock',
  'autovault_userscript',
];

describe('custody-labels', () => {
  it('defines all matrix flows', () => {
    for (const id of FLOW_IDS) {
      expect(CUSTODY_LABELS[id].short.length).toBeGreaterThan(10);
      expect(CUSTODY_LABELS[id].detail.length).toBeGreaterThan(20);
    }
  });

  it('scopes non-custodial to direct tips only', () => {
    expect(CUSTODY_LABELS.jtt_direct_tip.custodyClass).toBe('non_custodial');
    expect(CUSTODY_LABELS.jtt_credits_relay.custodyClass).toBe('pooled_relay');
  });

  it('getCustodyLabel returns short strings', () => {
    expect(getCustodyLabel('jtt_credits_relay')).toMatch(/pooled relay/i);
    expect(getCustodyDetail('wallet_action_lock')).toMatch(/timer-only/i);
  });
});
