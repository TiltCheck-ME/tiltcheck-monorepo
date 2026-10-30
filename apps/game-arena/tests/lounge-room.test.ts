/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */
import { describe, expect, it } from 'vitest';
import { LoungeRoom, LOUNGE_TAGLINE } from '../src/lounge/lounge-room.js';
import { LOUNGE_RECEIPTS_LINE, sanitizeGameTitle } from '../src/lounge/sanitize.js';

describe('LoungeRoom', () => {
  it('stores chat with username and timestamp, not wallets or amounts', () => {
    let now = 1_000;
    const room = new LoungeRoom({ now: () => now });
    room.join({ userId: 'u1', username: 'jme' });
    const posted = room.post('u1', 'jme', 'anyone else on vampire tonight');
    expect(posted.ok).toBe(true);
    if (!posted.ok) return;
    expect(posted.message.username).toBe('jme');
    expect(posted.message.timestamp).toBe(1_000);
    expect(posted.message.text).toBe('anyone else on vampire tonight');
    expect(JSON.stringify(room.snapshot())).not.toMatch(/BvzEqVRUicmW8Y6HFncLYrGXESpMbSNDkWUNTQj5GGGi/);
  });

  it('rate limits to 5 messages per 10 seconds', () => {
    let now = 10_000;
    const room = new LoungeRoom({ now: () => now });
    room.join({ userId: 'u1', username: 'jme' });
    for (let i = 0; i < 5; i += 1) {
      expect(room.post('u1', 'jme', `msg ${i}`).ok).toBe(true);
    }
    expect(room.post('u1', 'jme', 'one more').ok).toBe(false);
    now = 21_000;
    expect(room.post('u1', 'jme', 'later').ok).toBe(true);
  });

  it('mutes and reports', () => {
    const room = new LoungeRoom({ moderatorIds: ['mod'] });
    room.join({ userId: 'mod', username: 'mod' });
    room.join({ userId: 'u2', username: 'chase' });
    expect(room.mute('stranger', 'u2').ok).toBe(false);
    expect(room.mute('mod', 'u2').ok).toBe(true);
    expect(room.post('u2', 'chase', 'hello').ok).toBe(false);
    const report = room.report('mod', 'u2', 'spam');
    expect('reporterId' in report && report.targetId === 'u2').toBe(true);
    expect(room.reportsFor('u2')).toHaveLength(1);
  });

  it('shows game title only and drops amounts or wallets from presence', () => {
    const room = new LoungeRoom();
    const row = room.join({
      userId: 'u1',
      username: 'jme',
      gameTitle: 'Le Vampire',
    });
    expect(row.gameTitle).toBe('Le Vampire');
    expect(sanitizeGameTitle('won $62 on Le Vampire')).toBeNull();
    expect(sanitizeGameTitle('BvzEqVRUicmW8Y6HFncLYrGXESpMbSNDkWUNTQj5GGGi')).toBeNull();
    room.setPresence({ userId: 'u1', gameTitle: 'heater 1000x' });
    expect(room.snapshot().presence[0]?.gameTitle).toBeNull();
  });

  it('rejects amount and wallet chat with the receipts line', () => {
    const room = new LoungeRoom();
    room.join({ userId: 'u1', username: 'jme' });
    expect(room.post('u1', 'jme', 'just hit a 1000x').ok).toBe(false);
    const blocked = room.post('u1', 'jme', 'tip me BvzEqVRUicmW8Y6HFncLYrGXESpMbSNDkWUNTQj5GGGi');
    expect(blocked).toEqual({ ok: false, reason: LOUNGE_RECEIPTS_LINE });
    expect(room.snapshot().tagline).toBe(LOUNGE_TAGLINE);
  });

  it('does not treat typing or chat as betting activity', () => {
    const room = new LoungeRoom();
    room.join({ userId: 'u1', username: 'jme' });
    const posted = room.post('u1', 'jme', 'brb typing in chat');
    expect(posted.ok).toBe(true);
    const snap = room.snapshot();
    expect(snap.messages[0]?.text).toBe('brb typing in chat');
    expect(JSON.stringify(snap)).not.toContain('bet');
    expect(JSON.stringify(snap)).not.toContain('wager');
  });
});
