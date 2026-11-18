// node --test test/   (Node 20+: WebCrypto is global)
// Cash-out Buddy: pairing and pings. Runs the bundled worker (dist/index.js) against an in-memory KV and a stubbed Discord.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as B from '../src/buddy.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://collectclock-api.j-chapman7.workers.dev';

function kv(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    m,
    async get(k) { return m.has(k) ? m.get(k) : null; },
    async put(k, v) { m.set(k, String(v)); },
    async delete(k) { m.delete(k); },
    async list({ prefix = '' } = {}) { return { keys: [...m.keys()].filter(k => k.startsWith(prefix)).sort().map(name => ({ name })), list_complete: true }; },
  };
}

// ---------------- pure ----------------
test('ping body: only {type?, reason}; anything amount-like is refused with the privacy error', () => {
  assert.deepEqual(B.buddyCheckPing({ type: 'buddy_ping', reason: 'walk_away' }), { reason: 'walk_away' });
  assert.deepEqual(B.buddyCheckPing({ reason: 'tilt' }), { reason: 'tilt' });
  for (const k of ['amount', 'balance', 'initialBalance', 'peakBalance', 'profit', 'pnl', 'win', 'bet', 'wager', 'usd', 'game', 'casino', 'site', 'host', 'riskScore']) {
    const r = B.buddyCheckPing({ type: 'buddy_ping', reason: 'walk_away', [k]: 120 });
    assert.match(r.error || '', /never carry amounts/, k);
  }
  assert.match(B.buddyCheckPing({ reason: 'walk_away', note: 'hi' }).error, /Unexpected field/);
  assert.ok(B.buddyCheckPing({ reason: 'won $500' }).error, 'free-text reason refused');
  assert.ok(B.buddyCheckPing({ reason: 'walk_away', type: 'other' }).error);
  assert.ok(B.buddyCheckPing([]).error);
  assert.ok(B.buddyCheckPing(null).error);
});

test('ping copy is fixed: "<name> hit their walk-away." / "<name> could use a nudge."', () => {
  assert.equal(B.buddyPingText('Jme', 'walk_away'), 'Jme hit their walk-away.');
  assert.equal(B.buddyPingText('Jme', 'tilt'), 'Jme could use a nudge.');
  assert.equal(B.buddyPingText('', 'tilt'), 'Your buddy could use a nudge.');
  assert.equal(B.buddyPingText('@everyone **x**', 'walk_away'), 'everyone x hit their walk-away.', 'no mentions or markdown from names');
});

test('invite codes: XXXX-XXXX from an unambiguous alphabet; input is normalized', () => {
  for (let i = 0; i < 50; i++) assert.match(B.buddyNewCode(), /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
  assert.equal(B.buddyNormCode(' abcd efgh '), 'ABCD-EFGH');
  assert.equal(B.buddyNormCode('ABCD-EFG'), null);
  assert.equal(B.buddyNormCode('ABCD-EFG0'), null, '0 is not in the alphabet');
});

// ---------------- the bundled worker ----------------
function discord() {
  const calls = [];
  const fetchStub = async (u, init = {}) => {
    const url = String(u), body = init.body ? (typeof init.body === 'string' ? init.body : null) : null;
    calls.push({ url, method: init.method || 'GET', body, raw: init.body });
    let m;
    if (url === 'https://discord.com/api/v10/users/@me/channels') return Response.json({ id: 'dm-' + JSON.parse(body).recipient_id });
    if ((m = url.match(/\/channels\/dm-(\w+)\/messages$/))) return fetchStub.closed.has(m[1]) ? new Response('{"code":50007}', { status: 403 }) : Response.json({ id: 'msg' });
    if ((m = url.match(/\/api\/v10\/users\/(\w+)$/))) return Response.json({ id: m[1], global_name: 'Name' + m[1] });
    return new Response('nope', { status: 404 });
  };
  fetchStub.closed = new Set();
  return { calls, fetchStub, dms: to => calls.filter(c => c.url === `https://discord.com/api/v10/channels/dm-${to}/messages`).map(c => JSON.parse(c.body)) };
}

async function setup(extraEnv = {}) {
  execSync('./build.sh', { cwd: root });
  const { default: worker } = await import(path.join(root, 'dist/index.js') + '?t=' + Date.now() + Math.random());
  const tokA = 'a'.repeat(40), tokB = 'b'.repeat(40), tokC = 'c'.repeat(40);
  const store = kv({ ['sess:' + tokA]: '111', ['sess:' + tokB]: '222', ['sess:' + tokC]: '333' });
  const env = { CC: store, BOT_TOKEN: 'test-bot', ...extraEnv };
  const d = discord();
  const realFetch = globalThis.fetch;
  globalThis.fetch = d.fetchStub;
  const call = (p, tok, init = {}) => worker.fetch(new Request(ORIGIN + p, { ...init, headers: { ...(tok ? { Authorization: 'Bearer ' + tok } : {}), 'Content-Type': 'application/json', ...(init.headers || {}) } }), env);
  const post = (p, tok, b) => call(p, tok, { method: 'POST', body: JSON.stringify(b ?? {}) });
  return { worker, env, store, d, call, post, A: tokA, Bt: tokB, C: tokC, restore: () => { globalThis.fetch = realFetch; } };
}

test('pairing is mutual opt-in: invite code -> accept -> both see each other -> unpair ends it both ways', async () => {
  const s = await setup();
  try {
    assert.equal((await s.call('/buddy/status')).status, 401, 'needs the Discord session');
    const inv = await (await s.post('/buddy/invite', s.A)).json();
    assert.match(inv.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    assert.equal((await (await s.call('/buddy/status', s.A)).json()).invite.code, inv.code);
    // a second invite replaces the first
    const inv2 = await (await s.post('/buddy/invite', s.A)).json();
    assert.equal((await s.post('/buddy/accept', s.Bt, { code: inv.code })).status, 404, 'old code is dead');
    assert.equal((await s.post('/buddy/accept', s.A, { code: inv2.code })).status, 400, 'own code');
    assert.equal((await s.post('/buddy/accept', s.Bt, { code: 'nope' })).status, 400);
    const acc = await s.post('/buddy/accept', s.Bt, { code: inv2.code.toLowerCase().replace('-', ' ') });
    assert.equal(acc.status, 200);
    assert.equal((await acc.json()).buddy.name, 'Name111');
    assert.equal((await s.post('/buddy/accept', s.C, { code: inv2.code })).status, 404, 'codes are one-time');
    assert.equal(s.d.dms('111').length, 0, 'no message on accept (open question)');
    const sa = await (await s.call('/buddy/status', s.A)).json(), sb = await (await s.call('/buddy/status', s.Bt)).json();
    assert.equal(sa.paired, true); assert.equal(sa.count, 1); assert.equal(sa.buddies[0].name, 'Name222'); assert.equal(sa.invite, null);
    assert.equal(sb.count, 1); assert.equal(sb.buddies[0].name, 'Name111');
    assert.ok(!JSON.stringify(sa).includes('"222"'), 'status does not expose the raw Discord id');
    assert.match(sa.buddies[0].id, /^[a-f0-9]{16}$/);
    // unpair by buddy id from A's side ends it for B too
    assert.equal((await s.post('/buddy/unpair', s.A, { buddy: 'ffffffffffffffff' })).status, 404);
    const un = await (await s.post('/buddy/unpair', s.A, { buddy: sa.buddies[0].id })).json();
    assert.deepEqual(un, { ok: true, removed: 1, count: 0 });
    assert.equal((await (await s.call('/buddy/status', s.Bt)).json()).count, 0);
    assert.ok(![...s.store.m.keys()].some(k => k.startsWith('buddy:u:')), 'empty records are deleted');
  } finally { s.restore(); }
});

async function pairAB(s) {
  const { code } = await (await s.post('/buddy/invite', s.A)).json();
  assert.equal((await s.post('/buddy/accept', s.Bt, { code })).status, 200);
  s.d.calls.length = 0;
}

test('ping: paired only, fixed plain-text copy with no numbers, 1 per 10 min per pair', async () => {
  const s = await setup();
  try {
    assert.equal((await s.post('/buddy/ping', s.A, { type: 'buddy_ping', reason: 'walk_away' })).status, 409, 'no buddy yet');
    await pairAB(s);
    const bad = await s.post('/buddy/ping', s.A, { type: 'buddy_ping', reason: 'walk_away', balance: 812.5 });
    assert.equal(bad.status, 400); assert.match((await bad.json()).error, /never carry amounts/);
    assert.equal(s.d.calls.length, 0, 'a rejected ping reaches nobody');
    const r = await s.post('/buddy/ping', s.A, { type: 'buddy_ping', reason: 'walk_away' });
    assert.equal(r.status, 200); assert.deepEqual(await r.json(), { ok: true, sent: 1, skipped: 0, failed: 0 });
    const [dm] = s.d.dms('222');
    assert.deepEqual(dm, { content: 'Name111 hit their walk-away.', allowed_mentions: { parse: [] } }, 'plain text only, no buttons');
    // same pair again inside 10 min, either direction: refused, nothing sent
    s.d.calls.length = 0;
    assert.equal((await s.post('/buddy/ping', s.A, { reason: 'tilt' })).status, 429);
    assert.equal((await s.post('/buddy/ping', s.Bt, { reason: 'tilt' })).status, 429);
    assert.equal(s.d.calls.filter(c => /\/messages$/.test(c.url)).length, 0);
    // limit expires (KV TTL): delete the key and it goes through
    s.store.m.delete('buddy:rl:111:222');
    assert.equal((await s.post('/buddy/ping', s.Bt, { reason: 'tilt' })).status, 200);
    assert.equal(s.d.dms('111')[0].content, 'Name222 could use a nudge.');
    // C is not paired with anyone
    assert.equal((await s.post('/buddy/ping', s.C, { reason: 'walk_away' })).status, 409);
  } finally { s.restore(); }
});

test('ping that Discord refuses frees the limit and says so', async () => {
  const s = await setup();
  try {
    await pairAB(s);
    s.d.fetchStub.closed.add('222');
    const r = await s.post('/buddy/ping', s.A, { reason: 'walk_away' });
    assert.equal(r.status, 502); assert.match((await r.json()).error, /Could not reach your buddy/);
    assert.equal(s.store.m.has('buddy:rl:111:222'), false);
  } finally { s.restore(); }
});

test('buddy cap: invite and accept refuse past BUDDY_MAX', async () => {
  const s = await setup();
  try {
    s.store.m.set('buddy:u:111', JSON.stringify({ pairs: [{ u: '222', at: 1 }, { u: '444', at: 1 }, { u: '555', at: 1 }] }));
    assert.equal((await s.post('/buddy/invite', s.A)).status, 409);
    const { code } = await (await s.post('/buddy/invite', s.C)).json();
    assert.equal((await s.post('/buddy/accept', s.A, { code })).status, 409);
  } finally { s.restore(); }
});

test('existing routes are untouched by the buddy wiring', async () => {
  const s = await setup();
  try {
    assert.equal((await (await s.call('/stats/members')).json()).count, 0);
    assert.equal((await (await s.call('/')).json()).service, 'collectclock-api');
    assert.equal((await s.call('/buddy/whatever', s.A)).status, 404, 'unknown /buddy/* is a real 404, not the health JSON');
    assert.equal((await s.call('/buddy/nudge?t=x', s.A)).status, 404, 'no nudge route (open question)');
  } finally { s.restore(); }
});
