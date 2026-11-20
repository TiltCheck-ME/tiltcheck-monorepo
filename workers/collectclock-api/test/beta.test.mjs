// node --test test/   Beta counts route: strict validation, daily totals per version, no identifiers stored.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as B from '../src/beta.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function kv(init = {}) {
  const m = new Map(Object.entries(init)); const puts = [];
  return { m, puts,
    async get(k) { return m.has(k) ? m.get(k) : null; },
    async put(k, v, o) { puts.push({ k, v: String(v), o }); m.set(k, String(v)); },
    async delete(k) { m.delete(k); },
    async list({ prefix = '' } = {}) { return { keys: [...m.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; } };
}
const today = () => new Date().toISOString().slice(0, 10);
const good = (o = {}) => ({ schema: 1, version: '1.4.2', day: today(), counts: { install: 1, nudge_shown: 3, break_taken: 1 }, ...o });

let worker;
test.before(async () => {
  execSync('./build.sh', { cwd: root });
  ({ default: worker } = await import(path.join(root, 'dist/index.js') + '?beta=' + Date.now()));
});
const ORIGIN = 'https://collectclock-api.j-chapman7.workers.dev';
const post = (env, body, headers = {}) => worker.fetch(new Request(ORIGIN + '/beta/counts', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'TiltCheckExtension', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body) }), env);

test('valid batch is added to the day+version totals', async () => {
  const env = { CC: kv() };
  let r = await post(env, good());
  assert.equal(r.status, 200); assert.deepEqual(await r.json(), { ok: true });
  r = await post(env, good({ counts: { nudge_shown: 2, keep_win_hold: 1, cash_out: 0 } }));
  assert.equal(r.status, 200);
  await post(env, good({ version: '1.5.0', counts: { install: 1 } }));
  const doc = JSON.parse(env.CC.m.get('bc:' + today()));
  assert.deepEqual(doc, { v: {
    '1.4.2': { batches: 2, counts: { install: 1, nudge_shown: 5, break_taken: 1, keep_win_hold: 1, cash_out: 0 } },
    '1.5.0': { batches: 1, counts: { install: 1 } } } });
  assert.equal(env.CC.puts.at(-1).o.expirationTtl, B.BETA_TTL);
});

test('payload built exactly like beta-telemetry.ts buildBetaPayload is accepted (all 7 events, version "unknown")', async () => {
  const env = { CC: kv() };
  const counts = Object.fromEntries(B.BETA_EVENTS.map((e, i) => [e, i + 1]));
  assert.equal((await post(env, { schema: 1, version: 'unknown', day: today(), counts })).status, 200);
});

test('nothing but the summed numbers is stored: no IP, user agent, header or id', async () => {
  const env = { CC: kv() };
  await post(env, good(), { 'CF-Connecting-IP': '203.0.113.9', 'User-Agent': 'UA-SECRET-XYZ', Cookie: 'c=COOKIEVAL', Authorization: 'Bearer ' + 'x'.repeat(30) });
  assert.deepEqual([...env.CC.m.keys()], ['bc:' + today()]);
  const all = [...env.CC.m.values()].join('|');
  for (const s of ['203.0.113.9', 'UA-SECRET', 'COOKIEVAL', 'xxxxxxxx', 'TiltCheckExtension']) assert.ok(!all.includes(s), s);
});

test('strict validation rejects anything else with 400 and writes nothing', async () => {
  const env = { CC: kv() };
  const d = new Date(); const iso = t => new Date(t).toISOString().slice(0, 10);
  const bads = [
    {}, [], 'null', '"x"', 'not json', '',
    good({ extra: 1 }),
    { schema: 1, version: '1.0.0', day: today() },
    good({ schema: 2 }), good({ schema: '1' }),
    good({ version: '' }), good({ version: 'v1.0' }), good({ version: '1.0.0-beta' }), good({ version: '1.2.3.4.5' }), good({ version: '12345.1' }), good({ version: 7 }),
    good({ version: '<script>' }),
    good({ day: '2026-02-30' }), good({ day: '2026-1-01' }), good({ day: today() + 'T00:00' }), good({ day: 20261119 }),
    good({ day: iso(d.getTime() - 5 * 86400000) }), good({ day: iso(d.getTime() + 3 * 86400000) }),
    good({ counts: {} }), good({ counts: [] }), good({ counts: null }), good({ counts: 'install' }),
    good({ counts: { install: 1, user_id: 1 } }), good({ counts: { install: -1 } }), good({ counts: { install: 1.5 } }),
    good({ counts: { install: '1' } }), good({ counts: { install: B.BETA_MAX_COUNT + 1 } }), good({ counts: { install: 1e300 } }),
    good({ counts: { __proto__: null, constructor: 1 } }),
  ];
  for (const b of bads) {
    const r = await post(env, b);
    assert.equal(r.status, 400, 'should reject ' + (typeof b === 'string' ? b : JSON.stringify(b)));
  }
  assert.equal(env.CC.puts.length, 0);
});

test('rejects wrong content type, oversize body (with or without Content-Length), wrong method', async () => {
  const env = { CC: kv() };
  assert.equal((await post(env, good(), { 'Content-Type': 'text/plain' })).status, 400);
  const big = JSON.stringify(good({ pad: 'x'.repeat(2000) }));
  assert.equal((await post(env, big)).status, 400);
  const stream = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(big)); c.close(); } });
  const r = await worker.fetch(new Request(ORIGIN + '/beta/counts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: stream, duplex: 'half' }), env);
  assert.equal(r.status, 400);
  assert.equal((await worker.fetch(new Request(ORIGIN + '/beta/counts'), env)).status, 405);
  assert.equal(env.CC.puts.length, 0);
});

test('preflight allows the extension headers; responses carry the same CORS origin as other routes', async () => {
  const env = { CC: kv() };
  const r = await worker.fetch(new Request(ORIGIN + '/beta/counts', { method: 'OPTIONS' }), env);
  assert.equal(r.status, 204);
  assert.match(r.headers.get('Access-Control-Allow-Headers'), /X-Requested-With/);
  assert.match(r.headers.get('Access-Control-Allow-Methods'), /POST/);
  const other = await worker.fetch(new Request(ORIGIN + '/drops'), env);
  assert.equal((await post(env, good())).headers.get('Access-Control-Allow-Origin'), other.headers.get('Access-Control-Allow-Origin'));
  // generic preflight for other routes is unchanged
  const g = await worker.fetch(new Request(ORIGIN + '/support', { method: 'OPTIONS' }), env);
  assert.equal(g.headers.get('Access-Control-Allow-Headers'), 'Content-Type, Authorization');
});

test('daily caps: versions per day and batches per day answer 429 without writing', async () => {
  const env = { CC: kv() };
  for (let i = 0; i < B.BETA_MAX_VERSIONS_PER_DAY; i++) assert.equal((await post(env, good({ version: '0.0.' + i }))).status, 200);
  const n = env.CC.puts.length;
  assert.equal((await post(env, good({ version: '9.9.9' }))).status, 429);
  assert.equal((await post(env, good({ version: '0.0.1' }))).status, 200); // existing version still counts
  const env2 = { CC: kv({ ['bc:' + today()]: JSON.stringify({ v: { '1.0.0': { batches: B.BETA_MAX_BATCHES_PER_DAY, counts: {} } } }) }) };
  assert.equal((await post(env2, good({ version: '1.0.0' }))).status, 429);
  assert.equal(env2.CC.puts.length, 0);
  assert.equal(env.CC.puts.length, n + 1);
});

test('GET /admin/beta-counts is auth-gated like /admin/stats, and staff read totals', async () => {
  const env = { CC: kv(), BOT_TOKEN: 'test-not-a-token' }; // whoIs answers from the who: cache, no network
  assert.equal((await worker.fetch(new Request(ORIGIN + '/admin/beta-counts'), env)).status, 401);
  const tok = 't'.repeat(32);
  env.CC.m.set('sess:' + tok, 'u1');
  env.CC.m.set('who:u1', JSON.stringify({ staff: false, beta: true, name: 'x' }));
  assert.equal((await worker.fetch(new Request(ORIGIN + '/admin/beta-counts', { headers: { Authorization: 'Bearer ' + tok } }), env)).status, 403);
  env.CC.m.set('who:u1', JSON.stringify({ staff: true, beta: false, name: 'x' }));
  await post(env, good());
  const r = await worker.fetch(new Request(ORIGIN + '/admin/beta-counts?days=7', { headers: { Authorization: 'Bearer ' + tok } }), env);
  assert.equal(r.status, 200);
  const o = await r.json();
  assert.deepEqual(o.totals, { install: 1, nudge_shown: 3, break_taken: 1 });
  assert.equal(o.days[0].day, today());
});

test('existing routes unchanged: /support 401 signed out, root health, /drops', async () => {
  const env = { CC: kv() };
  assert.equal((await worker.fetch(new Request(ORIGIN + '/support', { method: 'POST', body: '{}' }), env)).status, 401);
  assert.deepEqual(await (await worker.fetch(new Request(ORIGIN + '/'), env)).json(), { ok: true, service: 'collectclock-api' });
  assert.deepEqual(await (await worker.fetch(new Request(ORIGIN + '/drops'), env)).json(), { drops: [] });
});
