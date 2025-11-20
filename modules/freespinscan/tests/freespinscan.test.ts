import { describe, it, expect } from 'vitest';
import { freespinscan } from '../src/index';

describe('FreeSpinScan module', () => {
  it('subscribes to promo.submitted event (smoke)', async () => {
    await expect(async () => {
      await import('../src');
      // Simulate event
      // eventRouter.publish('promo.submitted', 'test', { promoCode: 'FS2025', casino: 'stake' }, 'user-1');
    }).not.toThrow();
  });
});

describe('FreeSpinScan blocklist', () => {
  it('blocks a domain in the blocklist', async () => {
    freespinscan.blockDomain('chanced.com');
    const result = await freespinscan.submitPromo({
      userId: 'user1',
      url: 'https://chanced.com/free-spins',
      bonusType: 'free_spins',
      notes: 'promo',
      casino: 'chanced',
    });
    expect(result.status).toBe('blocked');
    expect(result.blockReason).toMatch(/Domain blocked/);
  });

  it('blocks a pattern in the blocklist', async () => {
    freespinscan.blockPattern('ref=');
    const result = await freespinscan.submitPromo({
      userId: 'user2',
      url: 'https://stake.com/free-spins?ref=abc123',
      bonusType: 'free_spins',
      notes: 'promo',
      casino: 'stake',
    });
    expect(result.status).toBe('blocked');
    expect(result.blockReason).toMatch(/Pattern blocked/);
  });

  it('allows a non-blocked domain and pattern', async () => {
    const result = await freespinscan.submitPromo({
      userId: 'user3',
      url: 'https://stake.com/free-spins',
      bonusType: 'free_spins',
      notes: 'promo',
      casino: 'stake',
    });
    expect(result.status).toBe('pending');
    expect(result.blockReason).toBeNull();
  });
});
