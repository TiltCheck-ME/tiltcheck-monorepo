// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
import { describe, expect, it } from 'vitest';
import * as brk from '../src/shared/breakTimer.js';
import { Room, createRoomState } from '../src/shared/room.js';
import { makeRng } from '../src/shared/rng.js';
import { roastFor } from '../src/client/copy.js';

const MIN = 60_000;

describe('break timer: start', () => {
  it('only accepts 5, 10 or 15 minutes', () => {
    const s = brk.createBreak();
    expect(brk.startBreak(s, 'a', 7, 0, ['a'])).toMatchObject({ code: 'bad-minutes' });
    expect(brk.startBreak(s, 'a', '10', 0, ['a'])).toMatchObject({ code: 'bad-minutes' });
    expect(brk.startBreak(s, 'a', 10, 1000, ['a', 'b'])).toEqual({ ok: true });
    expect(s.phase).toBe('running');
    expect(s.endsAt).toBe(1000 + 10 * MIN);
    expect(Object.keys(s.crew).sort()).toEqual(['a', 'b']);
  });

  it('cannot start twice', () => {
    const s = brk.createBreak();
    brk.startBreak(s, 'a', 5, 0, ['a']);
    expect(brk.startBreak(s, 'b', 15, 10, ['a', 'b'])).toMatchObject({ code: 'already-running' });
  });

  it('late arrivals join the running break', () => {
    const s = brk.createBreak();
    brk.startBreak(s, 'a', 5, 0, ['a']);
    brk.joinBreak(s, 'late', 30_000);
    expect(s.crew.late).toMatchObject({ joinedAt: 30_000, bailedAt: null });
  });
});

describe('break timer: bail', () => {
  it('records when you bailed and formats it', () => {
    const s = brk.createBreak();
    brk.startBreak(s, 'a', 10, 0, ['a', 'b']);
    expect(brk.bail(s, 'a', 3 * MIN + 12_000)).toEqual({ ok: true });
    expect(brk.bail(s, 'a', 4 * MIN)).toMatchObject({ code: 'already-bailed' });
    expect(brk.bail(s, 'nobody', 4 * MIN)).toMatchObject({ code: 'not-in-break' });
    const sum = brk.summarizeBreak(s);
    expect(sum.bailed).toEqual([{ id: 'a', at: '3:12', atMs: 192_000, left: false }]);
    expect(s.phase).toBe('running');
  });

  it('roast copy includes the bail time', () => {
    expect(roastFor('a', 192_000, '3:12')).toContain('3:12');
  });

  it('leaving the call counts as a bail', () => {
    const s = brk.createBreak();
    brk.startBreak(s, 'a', 5, 0, ['a', 'b']);
    brk.leaveBreak(s, 'b', 61_000);
    expect(s.crew.b).toMatchObject({ bailedAt: 61_000, left: true });
  });

  it('everyone bailing ends it early', () => {
    const s = brk.createBreak();
    brk.startBreak(s, 'a', 5, 0, ['a', 'b']);
    brk.bail(s, 'a', 10_000);
    brk.bail(s, 'b', 20_000);
    expect(s.phase).toBe('done');
    expect(brk.summarizeBreak(s).stuck).toEqual([]);
  });

  it('cannot bail when no break is running', () => {
    expect(brk.bail(brk.createBreak(), 'a', 0)).toMatchObject({ code: 'not-running' });
  });
});

describe('break timer: end', () => {
  it('ends exactly at endsAt and lists who stuck it out', () => {
    const s = brk.createBreak();
    brk.startBreak(s, 'a', 5, 0, ['a', 'b', 'c']);
    brk.bail(s, 'c', 90_000);
    expect(brk.tickBreak(s, 5 * MIN - 1)).toBe(false);
    expect(brk.tickBreak(s, 5 * MIN)).toBe(true);
    expect(s.phase).toBe('done');
    const sum = brk.summarizeBreak(s);
    expect(sum.stuck.sort()).toEqual(['a', 'b']);
    expect(sum.bailed[0]).toMatchObject({ id: 'c', at: '1:30' });
    expect(brk.resetBreak(s)).toEqual({ ok: true });
    expect(s.phase).toBe('idle');
  });

  it('cannot reset while running', () => {
    const s = brk.createBreak();
    brk.startBreak(s, 'a', 5, 0, ['a']);
    expect(brk.resetBreak(s)).toMatchObject({ code: 'still-running' });
  });

  it('formatClock', () => {
    expect(brk.formatClock(0)).toBe('0:00');
    expect(brk.formatClock(59_999)).toBe('0:59');
    expect(brk.formatClock(15 * MIN)).toBe('15:00');
    expect(brk.formatClock(-5)).toBe('0:00');
  });

  it('room: shared clock for everyone in the instance, alarm time exposed', () => {
    const room = new Room(createRoomState('i-1'), makeRng(1));
    room.join({ id: 'a', name: 'A', avatar: null }, 0);
    room.join({ id: 'b', name: 'B', avatar: null }, 0);
    expect(room.handle('a', { t: 'break.start', minutes: 5 }, 1000).ok).toBe(true);
    expect(room.nextWake()).toBe(1000 + 5 * MIN);
    const va = room.viewFor('a', 2000).brk;
    const vb = room.viewFor('b', 2000).brk;
    expect(va.endsAt).toBe(vb.endsAt);
    expect(vb.me.inBreak).toBe(true);
    room.join({ id: 'c', name: 'C', avatar: null }, 60_000);
    expect(room.viewFor('c', 60_000).brk.me.inBreak).toBe(true);
    expect(room.tick(1000 + 5 * MIN)).toBe(true);
    expect(room.viewFor('a', 0).brk.phase).toBe('done');
  });
});
