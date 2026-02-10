import { describe, it, expect, beforeEach } from 'vitest';
import { freespinscan } from '../src/index.js';

describe('FreeSpinScan approval/denial workflow', () => {
  beforeEach(() => {
    // Clear any existing state
    freespinscan['submissions'] = [];
  });

  it('approves a pending submission', async () => {
    const submission = await freespinscan.submitPromo({
      userId: 'user1',
      url: 'https://stake.com/free-spins',
      bonusType: 'free_spins',
      casino: 'stake',
    });

    const approved = await freespinscan.approveSubmission(submission.id, 'mod1');
    expect(approved.status).toBe('approved');
    expect(approved.reviewedBy).toBe('mod1');
    expect(approved.reviewedAt).toBeDefined();
  });

  it('denies a pending submission with reason', async () => {
    const submission = await freespinscan.submitPromo({
      userId: 'user2',
      url: 'https://stake.com/promo',
      bonusType: 'deposit',
      casino: 'stake',
    });

    const denied = await freespinscan.denySubmission(submission.id, 'mod2', 'Invalid bonus type');
    expect(denied.status).toBe('denied');
    expect(denied.reviewedBy).toBe('mod2');
    expect(denied.denyReason).toBe('Invalid bonus type');
  });

  it('gets pending submissions', async () => {
    await freespinscan.submitPromo({
      userId: 'user3',
      url: 'https://stake.com/promo1',
      bonusType: 'free_spins',
      casino: 'stake',
    });
    await freespinscan.submitPromo({
      userId: 'user4',
      url: 'https://stake.com/promo2',
      bonusType: 'deposit',
      casino: 'stake',
    });

    const pending = freespinscan.getSubmissions('pending');
    expect(pending.length).toBeGreaterThanOrEqual(2);
  });

  it('returns blocked domains and patterns', () => {
    freespinscan.blockDomain('scam.com');
    freespinscan.blockPattern('ref=');
    
    expect(freespinscan.getBlockedDomains()).toContain('scam.com');
    expect(freespinscan.getBlockedPatterns()).toContain('ref=');
  });
});
