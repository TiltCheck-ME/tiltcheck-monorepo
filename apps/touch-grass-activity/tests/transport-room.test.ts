// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
// @vitest-environment jsdom
// The client connects to the channel room key and sends its Discord instance id along so the
// worker can check the guild; DMs and old-style rooms send no ?instance=.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RemoteTransport } from '../src/client/transport.js';
import { roomKeyFor } from '../src/shared/protocol.js';

const urls: string[] = [];
class FakeWS {
  static OPEN = 1;
  static CONNECTING = 0;
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(url: string) {
    urls.push(url);
  }
  send(): void {}
  close(): void {}
}

afterEach(() => {
  urls.length = 0;
  vi.unstubAllGlobals();
});

async function firstUrl(t: RemoteTransport): Promise<URL> {
  await new Promise((r) => setTimeout(r, 0));
  t.close();
  return new URL(urls[0] as string);
}

describe('RemoteTransport room path', () => {
  it('server channel: g-<guild>-c-<channel> with ?instance= and ?guild=', async () => {
    vi.stubGlobal('WebSocket', FakeWS);
    const inst = 'i-1276580072400224306-gc-912952092627435520-912954213460484116';
    const room = roomKeyFor(inst, '912954213460484116');
    const u = await firstUrl(new RemoteTransport(room, 'tok', '/api', '912952092627435520', inst));
    expect(u.pathname).toBe('/api/room/g-912952092627435520-c-912954213460484116/ws');
    expect(u.searchParams.get('instance')).toBe(inst);
    expect(u.searchParams.get('guild')).toBe('912952092627435520');
  });

  it('DM: instance id path, no ?instance=', async () => {
    vi.stubGlobal('WebSocket', FakeWS);
    const inst = 'i-1276580072400224306-pc-912954213460484116';
    const u = await firstUrl(new RemoteTransport(roomKeyFor(inst, '912954213460484116'), 'tok', '/api', null, inst));
    expect(u.pathname).toBe(`/api/room/${inst}/ws`);
    expect(u.searchParams.has('instance')).toBe(false);
  });
});
