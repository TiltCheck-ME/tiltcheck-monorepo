// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { ASK_COMMAND, formatForDiscord } from '../src/discord.js';
import { handle } from '../src/index.js';
import { resetMemory } from '../src/limits.js';
import { fakeFetch } from './fixtures.mjs';

beforeEach(() => resetMemory());

const ask = (question, headers = {}) =>
  new Request('https://ask.example/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://tiltcheck.me', 'cf-connecting-ip': '203.0.113.9', ...headers },
    body: JSON.stringify({ question }),
  });

test('POST /ask from tiltcheck.me: CORS, answer shape, then the short cache', async () => {
  const calls = [];
  const env = {};
  const r1 = await handle(ask('Does Acebet have a freeze card?'), env, null, fakeFetch({ calls }));
  assert.equal(r1.status, 200);
  assert.equal(r1.headers.get('access-control-allow-origin'), 'https://tiltcheck.me');
  const b1 = await r1.json();
  assert.equal(b1.status, 'unknown');
  assert.equal(b1.cached, false);
  const before = calls.length;
  const b2 = await (await handle(ask('does acebet have a  freeze card?'), env, null, fakeFetch({ calls }))).json();
  assert.equal(b2.cached, true);
  assert.equal(calls.length, before, 'cached answer makes no network calls');
});

test('other origins are refused', async () => {
  const r = await handle(ask('Acebet minimum?', { origin: 'https://evil.example' }), {}, null, fakeFetch());
  assert.equal(r.status, 403);
  assert.equal(r.headers.get('access-control-allow-origin'), null);
});

test('rate limit: 6 a minute per IP, then 429', async () => {
  const f = fakeFetch();
  for (let i = 0; i < 6; i++) assert.equal((await handle(ask(`acebet q ${i}`), {}, null, f)).status, 200);
  const r = await handle(ask('acebet q 7'), {}, null, f);
  assert.equal(r.status, 429);
  assert.match((await r.json()).answer, /Slow down/);
  assert.equal((await handle(ask('acebet q 8', { 'cf-connecting-ip': '203.0.113.10' }), {}, null, f)).status, 200);
});

test('uses the rate-limit binding when it is bound', async () => {
  const env = { ASK_LIMITER: { limit: async () => ({ success: false }) } };
  assert.equal((await handle(ask('acebet'), env, null, fakeFetch())).status, 429);
});

test('long questions are refused', async () => {
  const r = await handle(ask('acebet '.repeat(60)), {}, null, fakeFetch());
  assert.equal(r.status, 400);
});

test('/health says whether the key is set, never the key', async () => {
  const r = await handle(new Request('https://ask.example/health'), { GROQ_API_KEY: 'gsk_test_value_not_real' }, null, fakeFetch());
  const text = await r.text();
  assert.deepEqual(JSON.parse(text), { ok: true, ready: true });
  assert.doesNotMatch(text, /gsk_/);
});

async function signer() {
  const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const pub = Buffer.from(await crypto.subtle.exportKey('raw', kp.publicKey)).toString('hex');
  return {
    pub,
    async request(body, { tamper = false } = {}) {
      const raw = JSON.stringify(body);
      const ts = String(Math.floor(Date.now() / 1000));
      const sig = Buffer.from(await crypto.subtle.sign({ name: 'Ed25519' }, kp.privateKey, new TextEncoder().encode(ts + raw))).toString('hex');
      return new Request('https://ask.example/discord/interactions', {
        method: 'POST',
        headers: { 'x-signature-ed25519': sig, 'x-signature-timestamp': ts, 'content-type': 'application/json' },
        body: tamper ? raw.replace('ask', 'asx') : raw,
      });
    },
  };
}

test('Discord: unsigned or tampered requests get 401, PING gets PONG', async () => {
  const s = await signer();
  const env = { DISCORD_PUBLIC_KEY: s.pub };
  const bad = await handle(await s.request({ type: 2, data: { name: 'ask' } }, { tamper: true }), env, null, fakeFetch());
  assert.equal(bad.status, 401);
  const none = await handle(new Request('https://ask.example/discord/interactions', { method: 'POST', body: '{"type":1}' }), env, null, fakeFetch());
  assert.equal(none.status, 401);
  const ping = await handle(await s.request({ type: 1 }), env, null, fakeFetch());
  assert.deepEqual(await ping.json(), { type: 1 });
});

test('Discord /ask: defers, then edits the reply with the answer and its links', async () => {
  const s = await signer();
  const env = { DISCORD_PUBLIC_KEY: s.pub };
  const calls = [];
  const pending = [];
  const ctx = { waitUntil: (p) => pending.push(p) };
  const body = {
    type: 2,
    application_id: '1445916179163250860',
    token: 'interaction-token',
    member: { user: { id: '111111111111111111' } },
    data: { name: 'ask', options: [{ name: 'question', type: 3, value: 'How long does Acebet take for freeze card redemption?' }] },
  };
  const res = await handle(await s.request(body), env, ctx, fakeFetch({ calls }));
  assert.deepEqual(await res.json(), { type: 5 });
  await Promise.all(pending);
  const edit = calls.find((c) => c.url.startsWith('https://discord.com/api/v10/webhooks/1445916179163250860/interaction-token/messages/@original'));
  assert.ok(edit, 'edits the deferred reply');
  assert.equal(edit.init.method, 'PATCH');
  const sent = JSON.parse(edit.init.body);
  assert.match(sent.content, /I don't know\. Acebet's pages and TiltCheck's records don't mention "freeze"/);
  assert.match(sent.content, /<https:\/\/acebet\.cc\/redemptions>/);
  assert.deepEqual(sent.allowed_mentions, { parse: [] });
});

test('Discord /ask is rate limited per user', async () => {
  const s = await signer();
  const env = { DISCORD_PUBLIC_KEY: s.pub, ASK_LIMITER: { limit: async () => ({ success: false }) } };
  const body = { type: 2, application_id: '1', token: 't', user: { id: '2' }, data: { name: 'ask', options: [{ name: 'question', value: 'acebet?' }] } };
  const out = await (await handle(await s.request(body), env, { waitUntil() {} }, fakeFetch())).json();
  assert.equal(out.type, 4);
  assert.equal(out.data.flags, 64);
});

test('command definition and message format', () => {
  assert.equal(ASK_COMMAND.name, 'ask');
  assert.equal(ASK_COMMAND.options[0].required, true);
  const text = formatForDiscord('q', { answer: 'A.', sources: [{ title: 'Acebet.cc Redemptions', url: 'https://acebet.cc/redemptions' }] });
  assert.equal(text, '> q\nA.\nSource:\n- [Acebet.cc Redemptions](<https://acebet.cc/redemptions>)');
  assert.ok(formatForDiscord('q', { answer: 'x'.repeat(5000), sources: [] }).length <= 1900);
});

test('Discord: the Activity entry point launches, other old commands get a short note', async () => {
  const { handleInteraction } = await import('../src/discord.js');
  const deps = { waitUntil: () => {}, answer: async () => ({}), allow: async () => true };
  assert.deepEqual(await handleInteraction({ type: 2, data: { type: 4, name: 'launch' } }, deps), { type: 12 });
  const other = await handleInteraction({ type: 2, data: { type: 1, name: 'casino' } }, deps);
  assert.equal(other.type, 4);
  assert.equal(other.data.flags, 64);
});
