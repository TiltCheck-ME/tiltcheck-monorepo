/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */
import { describe, expect, it } from 'vitest';
import {
  IdempotencyStore,
  InFlightTipLock,
  atomicDebit,
  renderTipForViewer,
  shouldAnnounceTip,
  stripWalletsFromView,
  viewerDegenLabel,
} from '../src/lounge/tips.js';

const secret = 'test-tip-label-secret';

describe('lounge tips', () => {
  it('shows usernames only to the two people in the tip', () => {
    const tip = {
      tipId: 't1',
      senderId: 'alice',
      receiverId: 'bob',
      senderUsername: 'Alice',
      receiverUsername: 'Bob',
      amountUsd: '2.00',
    };
    const alice = renderTipForViewer(secret, 'alice', tip);
    const bob = renderTipForViewer(secret, 'bob', tip);
    const eve = renderTipForViewer(secret, 'eve', tip);
    expect(alice.knownParties).toBe(true);
    expect(alice.toLabel).toBe('Bob');
    expect(alice.line).toContain('You tipped Bob');
    expect(bob.fromLabel).toBe('Alice');
    expect(bob.line).toContain('Alice tipped you');
    expect(eve.knownParties).toBe(false);
    expect(eve.fromLabel).toMatch(/^Degen #\d{4}$/);
    expect(eve.toLabel).toMatch(/^Degen #\d{4}$/);
    expect(eve.fromLabel).not.toBe(eve.toLabel);
    expect(JSON.stringify(eve)).not.toContain('Alice');
    expect(JSON.stringify(eve)).not.toContain('Bob');
    expect(JSON.stringify(eve)).not.toContain('alice');
    expect(viewerDegenLabel(secret, 'eve', 't1', 'sender')).not.toBe(viewerDegenLabel(secret, 'eve', 't2', 'sender'));
    expect(JSON.stringify(stripWalletsFromView(eve))).not.toMatch(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
  });

  it('allows one in-flight tip per sender and honors idempotency keys', () => {
    const lock = new InFlightTipLock();
    expect(lock.acquire('alice')).toBe(true);
    expect(lock.acquire('alice')).toBe(false);
    lock.release('alice');
    expect(lock.acquire('alice')).toBe(true);

    const store = new IdempotencyStore<{ tipId: string }>();
    const first = store.remember('click-1', { tipId: 't1' });
    const second = store.remember('click-1', { tipId: 't2' });
    expect(first).toEqual(second);
    expect(second.tipId).toBe('t1');
  });

  it('debits budget only when remaining covers the amount', () => {
    const rows = new Map([['alice', { remaining: 5 }]]);
    expect(atomicDebit(rows, 'alice', 2)).toBe(3);
    expect(atomicDebit(rows, 'alice', 4)).toBeNull();
    expect(rows.get('alice')?.remaining).toBe(3);
  });

  it('does not announce a tip until confirmed on-chain', () => {
    expect(shouldAnnounceTip({ commitment: 'processed' })).toBe(false);
    expect(shouldAnnounceTip({ commitment: 'confirmed' })).toBe(true);
  });
});
