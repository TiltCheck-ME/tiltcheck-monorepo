/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */
import { describe, expect, it } from 'vitest';
import {
  MIN_PAYOUT_SAMPLES,
  SEEDED_SCORECARDS,
  hashTermsBody,
  payoutLabel,
  publishClaim,
  rejectUnevidencedNegative,
  termsChanged,
} from '../src/lounge/scorecards.js';
import { LOUNGE_RECEIPTS_LINE } from '../src/lounge/sanitize.js';

describe('lounge scorecards', () => {
  it('seeds bink.bet and nuts.gg with terms evidence only', () => {
    expect(SEEDED_SCORECARDS.map((card) => card.domains[0]).sort()).toEqual(['bink.bet', 'nuts.gg']);
    for (const card of SEEDED_SCORECARDS) {
      expect(card.claims.every((claim) => !claim.negative || claim.evidence)).toBe(true);
      expect(card.claims[0]?.evidence?.url).toContain(card.domains[0]);
    }
  });

  it('rejects negative claims with no receipts', () => {
    expect(
      rejectUnevidencedNegative({
        id: 'x',
        label: 'cash out often',
        value: 'yes',
        negative: true,
        evidence: null,
      }),
    ).toEqual({ ok: false, reason: LOUNGE_RECEIPTS_LINE });
  });

  it('hashes terms and flags a daily diff', () => {
    const a = hashTermsBody('bonus 100%');
    const b = hashTermsBody('bonus 50%');
    expect(a).not.toBe(b);
    expect(termsChanged(a, 'bonus 50%')).toBe(true);
    expect(termsChanged(a, 'bonus 100%')).toBe(false);
  });

  it('labels thin logger samples as variance', () => {
    expect(payoutLabel(MIN_PAYOUT_SAMPLES - 1, 0.97)).toBe('probably just variance');
    expect(payoutLabel(MIN_PAYOUT_SAMPLES, 0.97)).toContain('0.97');
  });

  it('does not publish a negative claim without evidence', () => {
    const [bink] = SEEDED_SCORECARDS;
    const result = publishClaim(bink!, {
      id: 'staff-mean',
      label: 'staff attitude',
      value: 'rude',
      negative: true,
      evidence: null,
    });
    expect(result.ok).toBe(false);
  });
});
