/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */
import { describe, expect, it } from 'vitest';
import { FLAG_THRESHOLD, PeerFlagBoard } from '../src/lounge/peer-flags.js';

describe('anonymous peer tilt flags', () => {
  it('stays silent until 3 distinct established flaggers in 2 hours', () => {
    let now = 1_000;
    const board = new PeerFlagBoard(() => now);
    expect(board.submit({ flaggerId: 'flagger-a', targetId: 'z', accountAgeDays: 30, reputationOk: true }).ok).toBe(true);
    expect(board.submit({ flaggerId: 'flagger-b', targetId: 'z', accountAgeDays: 30, reputationOk: true }).ok).toBe(true);
    const third = board.submit({ flaggerId: 'flagger-c', targetId: 'z', accountAgeDays: 30, reputationOk: true });
    expect(third.ok && third.notify?.count === FLAG_THRESHOLD).toBe(true);
    if (third.ok) {
      expect(third.notify?.copy).toContain('Skip anytime');
      expect(third.notify?.copy).not.toContain('flagger-a');
      expect(third.notify?.copy).not.toContain('flagger-b');
      expect(third.notify?.copy).not.toContain('flagger-c');
    }
  });

  it('counts linked alts once and ignores new accounts and serial flaggers', () => {
    const board = new PeerFlagBoard();
    expect(board.submit({ flaggerId: 'new', targetId: 'z', accountAgeDays: 1, reputationOk: true }).ok).toBe(false);
    expect(board.submit({ flaggerId: 'a1', linkedId: 'house', targetId: 'z', accountAgeDays: 30, reputationOk: true }).ok).toBe(true);
    expect(board.submit({ flaggerId: 'a2', linkedId: 'house', targetId: 'z', accountAgeDays: 30, reputationOk: true }).ok).toBe(false);
    for (let i = 0; i < 10; i += 1) {
      expect(board.submit({ flaggerId: 'serial', targetId: `t${i}`, accountAgeDays: 30, reputationOk: true }).ok).toBe(true);
    }
    expect(board.submit({ flaggerId: 'serial', targetId: 't10', accountAgeDays: 30, reputationOk: true }).ok).toBe(false);
    expect(() => board.publicCount()).toThrow(/never public/);
  });
});
