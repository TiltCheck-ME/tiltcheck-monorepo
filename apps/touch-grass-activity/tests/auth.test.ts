// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
import { beforeEach, describe, expect, it } from 'vitest';
import { clearUserCache, exchangeCode, verifyToken } from '../worker/src/auth.js';
import { normalizePath } from '../worker/src/index.js';

describe('token exchange', () => {
  it('posts client id, secret, grant type and code with no redirect_uri', async () => {
    let sent: { url: string; body: string } | null = null;
    const fake = async (url: string, init?: RequestInit) => {
      sent = { url, body: String(init?.body) };
      return new Response(JSON.stringify({ access_token: 'at', refresh_token: 'rt', expires_in: 604800 }), { status: 200 });
    };
    const r = await exchangeCode('abc', { DISCORD_CLIENT_SECRET: 's3' }, fake);
    expect(r).toEqual({ status: 200, body: { access_token: 'at', expires_in: 604800 } });
    const form = new URLSearchParams(sent!.body);
    expect(sent!.url).toBe('https://discord.com/api/v10/oauth2/token');
    expect(Object.fromEntries(form)).toEqual({ client_id: '1445916179163250860', client_secret: 's3', grant_type: 'authorization_code', code: 'abc' });
    expect(form.has('redirect_uri')).toBe(false);
  });

  it('uses DISCORD_CLIENT_ID from env when set', async () => {
    let body = '';
    await exchangeCode('abc', { DISCORD_CLIENT_ID: '999', DISCORD_CLIENT_SECRET: 's' }, async (_u, i) => {
      body = String(i?.body);
      return new Response('{"access_token":"x"}');
    });
    expect(new URLSearchParams(body).get('client_id')).toBe('999');
  });

  it('fails closed without a secret or with a bad code', async () => {
    expect((await exchangeCode('abc', {})).status).toBe(500);
    expect((await exchangeCode('', { DISCORD_CLIENT_SECRET: 's' })).status).toBe(400);
    const r = await exchangeCode('abc', { DISCORD_CLIENT_SECRET: 's' }, async () => new Response('{}', { status: 400 }));
    expect(r.status).toBe(401);
  });
});

describe('token verify', () => {
  beforeEach(() => clearUserCache());

  it('maps /users/@me and caches it', async () => {
    let calls = 0;
    const fake = async () => {
      calls += 1;
      return new Response(JSON.stringify({ id: '123456789', username: 'jme', global_name: 'Jme', avatar: 'abc' }));
    };
    expect(await verifyToken('t', {}, fake)).toEqual({ id: '123456789', name: 'Jme', avatar: 'abc' });
    await verifyToken('t', {}, fake);
    expect(calls).toBe(1);
  });

  it('guest tokens only work when ALLOW_GUEST is on', async () => {
    expect(await verifyToken('guest:ana', {})).toBeNull();
    expect(await verifyToken('guest:ana', { ALLOW_GUEST: 'true' })).toMatchObject({ id: 'guest-ana' });
  });

  it('rejects a bad token', async () => {
    expect(await verifyToken('bad', {}, async () => new Response('', { status: 401 }))).toBeNull();
  });
});

describe('path normalisation (Discord proxy mapping styles)', () => {
  it.each([
    ['/api/activity/token', '/activity/token'],
    ['/activity/token', '/activity/token'],
    ['/.proxy/api/room/x/ws', '/room/x/ws'],
    ['/api', '/'],
  ])('%s -> %s', (input, out) => expect(normalizePath(input)).toBe(out));
});
