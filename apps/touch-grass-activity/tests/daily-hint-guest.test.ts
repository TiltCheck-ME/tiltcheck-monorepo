// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-14
// Daily Grass hint in guest mode: the real LocalTransport with the guest word list swapped in, the
// same way the browser build aliases it (vite.config.ts). Same rules as Discord: locked before the
// 3rd guess, one letter in its spot, once a day, answer stays out of the view until the game ends.
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/shared/dailyWords.js', () => import('../src/client/guestDailyWords.js'));

import { LocalTransport } from '../src/client/transport.js';
import { DAILY_ANSWERS } from '../src/client/guestDailyWords.js';
import { answerFor, hintPosition } from '../src/shared/daily.js';
import { dayNumberFor } from '../src/shared/scores.js';
import type { RoomView } from '../src/shared/protocol.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let t: LocalTransport | null = null;
afterEach(() => t?.close());

describe('Daily Grass hint: guest mode', () => {
  it('mirrors the worker on the guest words: locked, then one letter, then refused', async () => {
    t = new LocalTransport({ id: 'guest-1', name: 'Jme', avatar: null }, 'guest-room');
    let view: RoomView | null = null;
    const errors: string[] = [];
    t.onState((v) => (view = v));
    t.onError((c) => errors.push(c));
    const answer = answerFor(dayNumberFor(Date.now()), 'guest-practice', DAILY_ANSWERS);
    t.send({ t: 'daily.open' });
    await sleep(10);
    t.send({ t: 'daily.hint' });
    await sleep(10);
    expect(errors).toEqual(['hint-locked']);
    // Any five letters count in guest mode; none of these is a guest answer.
    for (const w of ['zzzzz', 'yyyyy', 'xxxxx']) {
      t.send({ t: 'daily.guess', word: w });
      await sleep(10);
    }
    t.send({ t: 'daily.hint' });
    await sleep(10);
    const me = (view as RoomView | null)?.daily.me;
    expect(me?.status).toBe('playing');
    const pos = hintPosition((me?.rows ?? []).map((r) => r.colors));
    expect(pos).toBeGreaterThanOrEqual(0);
    expect(me?.hint).toEqual({ pos, letter: answer[pos] });
    expect(me?.answer).toBeNull();
    expect(JSON.stringify(view)).not.toContain(`"${answer}"`);
    t.send({ t: 'daily.hint' });
    await sleep(10);
    expect(errors).toEqual(['hint-locked', 'hint-used']);
  });
});
