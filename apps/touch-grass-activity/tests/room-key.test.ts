// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// Channel room keys: every launch in one server channel shares a room; the guild in the key is
// checked against the guild the presented Discord instance id names, never the client's word.
import { describe, expect, it } from 'vitest';
import { guildForInstance, isValidInstanceId, parseChannelRoomKey, resolveRoom, roomKeyFor } from '../src/shared/protocol.js';

const G = '912952092627435520';
const G2 = '1488253239643078787';
const CH = '912954213460484116';
const CH2 = '912954213460484999';
const instA = `i-1276580072400224306-gc-${G}-${CH}`;
const instB = `i-1299999999999999999-gc-${G}-${CH}`;

describe('roomKeyFor', () => {
  it('two different instance ids in the same guild + channel give the same room', () => {
    expect(roomKeyFor(instA, CH)).toBe(`g-${G}-c-${CH}`);
    expect(roomKeyFor(instB, CH)).toBe(roomKeyFor(instA, CH));
  });

  it('a different channel gives a different room', () => {
    expect(roomKeyFor(`i-1-gc-${G}-${CH2}`, CH2)).toBe(`g-${G}-c-${CH2}`);
    expect(roomKeyFor(`i-1-gc-${G}-${CH2}`, CH2)).not.toBe(roomKeyFor(instA, CH));
  });

  it('DM / group DM, missing or junk channel, unknown instance shape: falls back to the instance id', () => {
    const dm = `i-1276580072400224306-pc-${CH}`;
    expect(roomKeyFor(dm, CH)).toBe(dm);
    expect(roomKeyFor(instA, null)).toBe(instA);
    expect(roomKeyFor(instA, undefined)).toBe(instA);
    expect(roomKeyFor(instA, '')).toBe(instA);
    expect(roomKeyFor(instA, '12ab')).toBe(instA);
    expect(roomKeyFor(instA, '123')).toBe(instA);
    expect(roomKeyFor(instA, `${CH}/../x`)).toBe(instA);
    // Guild never from the client: an id that doesn't name a guild stays an instance room.
    expect(roomKeyFor('local-dev', CH)).toBe('local-dev');
    expect(roomKeyFor('i-local-test', CH)).toBe('i-local-test');
  });

  it('keys fit the instance id validator and the live registry shape, and parse back', () => {
    const key = roomKeyFor(instA, CH);
    expect(isValidInstanceId(key)).toBe(true);
    expect(parseChannelRoomKey(key)).toEqual({ guild: G, channel: CH });
    expect(parseChannelRoomKey(instA)).toBeNull();
    expect(guildForInstance(key, '999999999999')).toBe(G);
  });
});

describe('resolveRoom (server side)', () => {
  const key = `g-${G}-c-${CH}`;

  it('accepts a channel key alongside an instance id from the same guild', () => {
    expect(resolveRoom(key, instA, null)).toEqual({ ok: true, roomKey: key, guild: G });
    expect(resolveRoom(key, instB, 'ignored')).toEqual({ ok: true, roomKey: key, guild: G });
  });

  it('rejects a key whose guild does not match the presented instance id', () => {
    expect(resolveRoom(`g-${G2}-c-${CH}`, instA, G2)).toEqual({ ok: false, status: 403, error: 'room-guild-mismatch' });
    // A DM instance or an unknown shape names no guild, so it can't vouch for a channel key.
    expect(resolveRoom(key, `i-1-pc-${CH}`, G)).toEqual({ ok: false, status: 403, error: 'room-guild-mismatch' });
    expect(resolveRoom(key, 'i-local-test', G)).toEqual({ ok: false, status: 403, error: 'room-guild-mismatch' });
  });

  it('rejects a channel key with no or a junk instance, and malformed g- keys', () => {
    expect(resolveRoom(key, null, G)).toMatchObject({ ok: false, status: 400 });
    expect(resolveRoom(key, 'bad id!', G)).toMatchObject({ ok: false, status: 400 });
    expect(resolveRoom(`g-${G}-c-nope`, instA, G)).toMatchObject({ ok: false, status: 400 });
    expect(resolveRoom(`g-${G}`, instA, G)).toMatchObject({ ok: false, status: 400 });
    expect(resolveRoom('bad id!', null, null)).toMatchObject({ ok: false, status: 400 });
  });

  it('instance id rooms work exactly as before (DMs, old clients, guest)', () => {
    expect(resolveRoom(instA, null, '999999999999')).toEqual({ ok: true, roomKey: instA, guild: G });
    expect(resolveRoom(`i-1-pc-${CH}`, null, G)).toEqual({ ok: true, roomKey: `i-1-pc-${CH}`, guild: null });
    expect(resolveRoom('local-dev', null, '999999999999')).toEqual({ ok: true, roomKey: 'local-dev', guild: '999999999999' });
  });
});
