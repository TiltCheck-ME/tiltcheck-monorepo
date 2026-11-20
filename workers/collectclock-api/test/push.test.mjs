// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
// node --test test/   (Node 20+: WebCrypto is global)
import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as P from '../src/push.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function kv(init = {}) {
  const m = new Map(Object.entries(init));
  const ops = { put: 0, list: 0, get: 0 };
  return {
    m, ops,
    async get(k) { ops.get++; return m.has(k) ? m.get(k) : null; },
    async put(k, v) { ops.put++; m.set(k, String(v)); },
    async delete(k) { m.delete(k); },
    async list({ prefix = '' } = {}) { ops.list++; return { keys: [...m.keys()].filter(k => k.startsWith(prefix)).sort().map(name => ({ name })), list_complete: true }; },
  };
}
const MIN = 60000;
const at = iso => Date.parse(iso);

// ---------------- crypto ----------------
test('aes128gcm matches the RFC 8291 section 5 example byte for byte', async () => {
  const body = await P.encryptPayload('When I grow up, I want to be a watermelon',
    'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
    'BTBZMqHH6r4Tts7J_aSIgg',
    { salt: 'DGv6ra1nlYgDCS1FRnbzlw', asPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
      asPublic: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8' });
  assert.equal(P.b64u(body),
    'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN');
});

test('aes128gcm round-trips with fresh keys and the RFC receiver decrypts the RFC body', async () => {
  const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const d = (await crypto.subtle.exportKey('jwk', kp.privateKey)).d;
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const msg = JSON.stringify({ title: 'Nuts.gg', body: 'Nuts.gg: giveaway in 1 min' });
  const body = await P.encryptPayload(msg, pub, auth);
  assert.equal(body.length, 86 + msg.length + 1 + 16);
  assert.equal(new TextDecoder().decode(await P.decryptPayload(body, d, pub, auth)), msg);
  const rfc = P.unb64u('DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN');
  const pt = await P.decryptPayload(rfc, 'q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94', 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', 'BTBZMqHH6r4Tts7J_aSIgg');
  assert.equal(new TextDecoder().decode(pt), 'When I grow up, I want to be a watermelon');
});

test('encryptPayload rejects a receiver key that is not a P-256 point', async () => {
  const bad = new Uint8Array(65); bad[0] = 4; bad[1] = 7;
  await assert.rejects(P.encryptPayload('x', bad, new Uint8Array(16)));
});

async function vapidEnv() {
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const d = (await crypto.subtle.exportKey('jwk', kp.privateKey)).d;
  return { env: { VAPID_PUBLIC: P.b64u(pub), VAPID_PRIVATE: d }, kp };
}

test('VAPID header is a valid ES256 JWT for the push service origin (RFC 8292)', async () => {
  const { env, kp } = await vapidEnv();
  const now = Date.now();
  const h = await P.vapidAuth('https://web.push.apple.com/QGuQyavXutnMkpU0bBp5', env, now);
  const m = h.match(/^vapid t=([^,]+), k=(.+)$/);
  assert.ok(m, h);
  assert.equal(m[2], env.VAPID_PUBLIC);
  const [hd, cl, sig] = m[1].split('.');
  assert.deepEqual(JSON.parse(new TextDecoder().decode(P.unb64u(hd))), { typ: 'JWT', alg: 'ES256' });
  const claims = JSON.parse(new TextDecoder().decode(P.unb64u(cl)));
  assert.equal(claims.aud, 'https://web.push.apple.com');
  assert.ok(claims.exp > now / 1000 && claims.exp <= now / 1000 + 24 * 3600, 'exp within 24h');
  assert.match(claims.sub, /^(mailto:|https:)/);
  const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, kp.publicKey, P.unb64u(sig), new TextEncoder().encode(hd + '.' + cl));
  assert.ok(ok, 'signature verifies with the public key');
});

// ---------------- scheduler ----------------
const entry = (sites, extra = {}) => ({ u: '1', subs: [], prefs: { lead: 60, tz: 'America/Chicago', quiet: { on: false, start: '23:00', end: '08:00' }, sites, ...extra.prefs }, timers: extra.timers || {} });
function sweep(e, from, to) {
  const out = [];
  for (let b = Math.floor(from / MIN); b <= Math.ceil(to / MIN); b++) for (const ev of P.dueAt(e, b)) out.push({ ...ev, sentAt: b * MIN });
  return out;
}

test('per-user timer: heads-up 60-119 s before with 1 min lead, ready 0-59 s after, once each', () => {
  for (const endsAt of [at('2026-11-12T20:30:00Z'), at('2026-11-12T20:30:45Z'), at('2026-11-12T20:30:01Z')]) {
    const e = entry({ 'Stake.us': { on: true } }, { timers: { 'Stake.us': endsAt } });
    const sent = sweep(e, endsAt - 10 * MIN, endsAt + 10 * MIN);
    assert.equal(sent.length, 2, 'exactly one heads-up and one ready');
    const soon = sent.find(s => s.kind === 'soon'), ready = sent.find(s => s.kind === 'ready');
    const early = endsAt - soon.sentAt; assert.ok(early >= 60000 && early < 120000, `heads-up early by ${early}`);
    const late = ready.sentAt - endsAt; assert.ok(late >= 0 && late < 60000, `ready late by ${late}`);
    assert.equal(P.line(soon), 'Stake.us: ready in 1 min');
    assert.equal(P.line(ready), 'Stake.us: ready now');
  }
});

test('30 s lead lands 30-89 s early; lead off sends only "ready now"', () => {
  const endsAt = at('2026-11-12T20:30:20Z');
  const e30 = entry({ A: { on: true } }, { timers: { A: endsAt }, prefs: { lead: 30 } });
  const s30 = sweep(e30, endsAt - 5 * MIN, endsAt + 5 * MIN);
  const soon = s30.find(s => s.kind === 'soon'); const early = endsAt - soon.sentAt;
  assert.ok(early >= 30000 && early < 90000, `early ${early}`);
  assert.equal(P.line(soon), 'A: ready in 30 sec');
  const e0 = entry({ A: { on: true } }, { timers: { A: endsAt }, prefs: { lead: 0 } });
  assert.deepEqual(sweep(e0, endsAt - 5 * MIN, endsAt + 5 * MIN).map(s => s.kind), ['ready']);
});

test('sites are opt-in: a timer with no alert setting sends nothing', () => {
  const endsAt = at('2026-11-12T20:30:00Z');
  const e = entry({}, { timers: { 'Stake.us': endsAt } });
  assert.equal(sweep(e, endsAt - 5 * MIN, endsAt + 5 * MIN).length, 0);
  assert.equal(Object.keys(P.cleanPrefs({ sites: { X: { on: false }, Y: {} } }).sites).length, 0);
});

test('fixed clock: every 30 min on :00/:30 (Chicago) gives "in 1 min" at :29/:59 and "now" on the dot', () => {
  const e = entry({ 'Nuts.gg': { on: true, every: 30, anchor: '00:00', label: 'giveaway' } });
  const from = at('2026-11-12T18:00:00Z'), to = at('2026-11-12T19:59:59Z');
  const sent = sweep(e, from, to).filter(s => s.sentAt >= from && s.sentAt <= to);
  const fmt = s => new Date(s.sentAt).toISOString().slice(11, 16) + ' ' + s.kind;
  assert.deepEqual(sent.map(fmt), ['18:00 ready', '18:29 soon', '18:30 ready', '18:59 soon', '19:00 ready', '19:29 soon', '19:30 ready', '19:59 soon']);
  assert.equal(P.line(sent[1]), 'Nuts.gg: giveaway in 1 min');
  assert.equal(P.line(sent[2]), 'Nuts.gg: giveaway now');
});

test('fixed clock anchors: offset anchor, multi-hour interval, and a half-hour time zone', () => {
  const times = (rule, tz, a, b) => P.recurringTimes(rule, tz, at(a), at(b)).map(t => new Date(t).toISOString().slice(11, 16));
  assert.deepEqual(times({ every: 30, anchor: '00:10' }, 'America/Chicago', '2026-11-12T18:00:00Z', '2026-11-12T19:00:00Z'), ['18:10', '18:40']);
  // every 4 h lined up with 01:00 Chicago (UTC-6): 01,05,09,13,17,21 local = 07,11,15,19,23,03 UTC
  assert.deepEqual(times({ every: 240, anchor: '01:00' }, 'America/Chicago', '2026-11-12T06:00:00Z', '2026-11-12T20:00:00Z'), ['07:00', '11:00', '15:00', '19:00']);
  // hourly on the local hour in India (UTC+5:30) is :30 UTC
  assert.deepEqual(times({ every: 60, anchor: '00:00' }, 'Asia/Kolkata', '2026-11-12T18:00:00Z', '2026-11-12T20:00:00Z'), ['18:30', '19:30']);
  // the "from" bound is inclusive when it sits on an occurrence
  assert.deepEqual(times({ every: 30, anchor: '00:00' }, 'UTC', '2026-11-12T18:00:00Z', '2026-11-12T18:20:00Z'), ['18:00']);
});

test('dedupe: across a day of minute runs every (site, kind, end time) is sent exactly once', () => {
  const e = entry({
    'Nuts.gg': { on: true, every: 30, anchor: '00:00', label: 'giveaway' },
    'Bink.bet wheel': { on: true, every: 60, anchor: '00:15', custom: true },
    'Stake.us': { on: true },
  }, { timers: { 'Stake.us': at('2026-11-12T21:07:31Z') } });
  const sent = sweep(e, at('2026-11-12T12:00:00Z'), at('2026-11-13T11:59:00Z'));
  const keys = sent.map(s => `${s.site}|${s.kind}|${s.at}`);
  assert.equal(new Set(keys).size, keys.length, 'no duplicates');
  assert.equal(sent.filter(s => s.site === 'Stake.us').length, 2);
  assert.equal(sent.filter(s => s.site === 'Nuts.gg' && s.kind === 'ready').length, 48);
});

test('a minute with several events is one coalesced message', () => {
  const e = entry({ A: { on: true }, B: { on: true }, C: { on: true }, D: { on: true } }, { timers: { A: at('2026-11-12T20:30:00Z'), B: at('2026-11-12T20:29:10Z'), C: at('2026-11-12T20:29:59Z'), D: at('2026-11-12T20:29:30Z') } });
  const ev = P.dueAt(e, at('2026-11-12T20:30:00Z') / MIN);
  assert.equal(ev.length, 4);
  const m = P.message(ev);
  assert.equal(m.title, 'CollectClock');
  assert.equal(m.body.split('\n').length, 4);
  assert.match(m.body, /and 1 more$/);
  assert.equal(m.tag, 'cc-multi');
});

test('quiet hours (wrapping midnight, local time) silence alerts; off by default', () => {
  const q = { on: true, start: '23:00', end: '07:00' };
  const e = entry({ 'Nuts.gg': { on: true, every: 30, anchor: '00:00' } }, { prefs: { quiet: q } });
  // 23:30 Chicago = 05:30 UTC next day (CST, UTC-6)
  assert.equal(P.dueAt(e, at('2026-11-13T05:30:00Z') / MIN).length, 0, '23:30 local is quiet');
  assert.equal(P.dueAt(e, at('2026-11-13T12:30:00Z') / MIN).length, 0, '06:30 local is quiet');
  assert.equal(P.dueAt(e, at('2026-11-13T13:00:00Z') / MIN).length, 1, '07:00 local is not quiet');
  assert.equal(P.cleanPrefs({}).quiet.on, false);
});

test('hourly cap: an every-5-min timer with a heads-up is held to the cap', () => {
  const e = entry({ X: { on: true, every: 5, anchor: '00:00' } });
  const from = at('2026-11-12T18:00:00Z');
  const sentBuckets = new Set(sweep(e, from, from + 120 * MIN).map(s => s.sentAt));
  for (const b of sentBuckets) {
    const inHour = [...sentBuckets].filter(x => x <= b && x > b - 60 * MIN).length;
    assert.ok(inHour <= P.HOURLY_CAP, `at most ${P.HOURLY_CAP} per rolling hour, got ${inHour}`);
  }
});

test('prefs are sanitized: bad intervals, times, zones and custom entries without a schedule are dropped', () => {
  const httpUrl = v => (/^https:\/\/\S+\.\S+/.test(v || '') ? v : null);
  const p = P.cleanPrefs({ lead: 45, tz: 'Mars/Base', quiet: { on: true, start: '25:00', end: '07:00' },
    sites: { 'Nuts.gg': { on: true, every: 7, anchor: '00:00' }, 'Bink.bet wheel': { on: true, custom: true }, 'Bink.bet drop': { on: true, custom: true, every: 60, anchor: '00:15', url: 'javascript:alert(1)' }, 'Ok': { on: true, every: 30, anchor: '00:30', label: '@everyone giveaway' } } }, httpUrl);
  assert.equal(p.lead, 60); assert.equal(p.tz, 'UTC'); assert.equal(p.quiet.start, '23:00');
  assert.deepEqual(p.sites['Nuts.gg'], { on: true });
  assert.equal(p.sites['Bink.bet wheel'], undefined);
  assert.equal(p.sites['Bink.bet drop'].url, undefined);
  assert.equal(p.sites.Ok.label, 'everyone giveaway');
});

test('subscriptions are only accepted for real push services with valid keys', () => {
  const keys = { p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', auth: 'BTBZMqHH6r4Tts7J_aSIgg' };
  assert.ok(P.cleanSub({ endpoint: 'https://web.push.apple.com/abc', keys }));
  assert.ok(P.cleanSub({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys }));
  assert.ok(P.cleanSub({ endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/abc', keys }));
  assert.equal(P.cleanSub({ endpoint: 'https://evil.example.com/push', keys }), null);
  assert.equal(P.cleanSub({ endpoint: 'http://web.push.apple.com/abc', keys }), null);
  assert.equal(P.cleanSub({ endpoint: 'https://web.push.apple.com/abc', keys: { ...keys, auth: 'AAAA' } }), null);
});

// ---------------- cron path with fake KV ----------------
const SUB_OK = { endpoint: 'https://web.push.apple.com/ok', p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', auth: 'BTBZMqHH6r4Tts7J_aSIgg' };
const SUB_GONE = { ...SUB_OK, endpoint: 'https://fcm.googleapis.com/fcm/send/gone' };

test('cron: sends due alerts, deletes 404/410 subscriptions, and does not resend in the next minute', async () => {
  const S = at('2026-11-12T20:29:00Z');
  const prefs = P.cleanPrefs({ lead: 60, tz: 'America/Chicago', sites: { 'Nuts.gg': { on: true, every: 30, anchor: '00:00', label: 'giveaway' } } });
  const store = kv({ 'push:sub:42': JSON.stringify({ subs: [SUB_OK, SUB_GONE], prefs }), 'user:42': '{}' });
  const env = { CC: store, VAPID_PUBLIC: 'x', VAPID_PRIVATE: 'y' };
  const calls = [];
  const send = async (sub, msg) => { calls.push({ ep: sub.endpoint, msg }); return sub === SUB_GONE || sub.endpoint === SUB_GONE.endpoint ? 410 : 201; };
  const r1 = await P.pushTick(env, S, { send });
  assert.equal(r1.sends, 2); assert.equal(r1.dead, 1);
  assert.equal(calls[0].msg.body, 'Nuts.gg: giveaway in 1 min');
  assert.match(calls[0].msg.url, /#cc_site=Nuts\.gg$/);
  const rec = JSON.parse(store.m.get('push:sub:42'));
  assert.deepEqual(rec.subs.map(s => s.endpoint), [SUB_OK.endpoint], 'dead subscription removed from storage');
  assert.deepEqual(JSON.parse(store.m.get('push:plan')).users[0].subs.map(s => s.endpoint), [SUB_OK.endpoint], 'and from the plan');
  calls.length = 0;
  const r2 = await P.pushTick(env, S + MIN, { send }); // 20:30 -> "now"
  assert.equal(r2.sends, 1); assert.equal(calls[0].msg.body, 'Nuts.gg: giveaway now');
  calls.length = 0;
  const r3 = await P.pushTick(env, S + 2 * MIN, { send }); // 20:31 -> nothing
  assert.equal(r3.sends, 0);
});

test('cron: plan rebuild is cheap (no KV write when nothing changed, rebuild on push:dirty)', async () => {
  const prefs = P.cleanPrefs({ sites: { A: { on: true } } });
  const store = kv({ 'push:sub:7': JSON.stringify({ subs: [SUB_OK], prefs }), 'user:7': JSON.stringify({ timers: { A: { endsAt: at('2026-11-12T22:00:00Z') } } }) });
  const env = { CC: store, VAPID_PUBLIC: 'x', VAPID_PRIVATE: 'y' };
  const send = async () => 201;
  await P.pushTick(env, at('2026-11-12T20:00:00Z'), { send }); // first: builds plan
  const puts = store.ops.put, lists = store.ops.list;
  await P.pushTick(env, at('2026-11-12T20:01:00Z'), { send }); // not a rebuild minute
  assert.equal(store.ops.list, lists, 'no list on ordinary minutes');
  await P.pushTick(env, at('2026-11-12T20:05:00Z'), { send }); // rebuild minute, unchanged
  assert.equal(store.ops.list, lists + 1); assert.equal(store.ops.put, puts, 'unchanged plan is not rewritten');
  store.m.set('user:7', JSON.stringify({ timers: { A: { endsAt: at('2026-11-12T20:07:30Z') } } }));
  store.m.set('push:dirty', String(Date.now() + 1000));
  await P.pushTick(env, at('2026-11-12T20:06:00Z'), { send }); // dirty -> rebuild now; 20:07:30 heads-up is in 20:06
  assert.equal(JSON.parse(store.m.get('push:plan')).users[0].timers.A, at('2026-11-12T20:07:30Z'));
});

test('cron: does nothing until VAPID secrets exist', async () => {
  const r = await P.pushTick({ CC: kv() }, Date.now());
  assert.equal(r.skipped, 'no vapid keys');
});

// ---------------- the bundled worker ----------------
test('bundle builds and the worker serves /push/* with the existing Discord session', async () => {
  execSync('./build.sh', { cwd: root });
  const { default: worker } = await import(path.join(root, 'dist/index.js') + '?t=' + Date.now());
  const { env: v } = await vapidEnv();
  const store = kv({ ['sess:' + 'a'.repeat(40)]: '99' });
  const env = { CC: store, ...v };
  const call = (p, init = {}) => worker.fetch(new Request('https://collectclock-api.j-chapman7.workers.dev' + p, init), env);
  assert.equal((await (await call('/push/key')).json()).publicKey, v.VAPID_PUBLIC);
  assert.equal((await call('/push/prefs')).status, 401, 'needs sign-in');
  const auth = { Authorization: 'Bearer ' + 'a'.repeat(40), 'Content-Type': 'application/json' };
  const bad = await call('/push/subscribe', { method: 'POST', headers: auth, body: JSON.stringify({ subscription: { endpoint: 'https://evil.example/x', keys: {} } }) });
  assert.equal(bad.status, 400);
  const ok = await call('/push/subscribe', { method: 'POST', headers: auth, body: JSON.stringify({ subscription: { endpoint: SUB_OK.endpoint, keys: { p256dh: SUB_OK.p256dh, auth: SUB_OK.auth } }, prefs: { tz: 'America/Chicago', sites: { 'Nuts.gg': { on: true, every: 30, anchor: '00:00' } } } }) });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('Access-Control-Allow-Origin'), 'https://tiltcheck-me.github.io');
  assert.ok(store.m.get('push:dirty'));
  const pr = await (await call('/push/prefs', { headers: auth })).json();
  assert.equal(pr.devices, 1); assert.equal(pr.prefs.sites['Nuts.gg'].every, 30);
  const un = await (await call('/push/unsubscribe', { method: 'POST', headers: auth, body: JSON.stringify({ endpoint: SUB_OK.endpoint }) })).json();
  assert.equal(un.devices, 0);
  // the existing routes still answer
  assert.equal((await (await call('/stats/members')).json()).count, 0);
  // the scheduled handler routes '* * * * *' to push only
  const waits = [];
  await worker.scheduled({ cron: '* * * * *', scheduledTime: Date.now() }, env, { waitUntil: p => waits.push(p) });
  await Promise.all(waits);
  assert.ok(store.m.has('push:plan'));
});

// ---------------- built-in schedules (Nuts.gg giveaway + Bink) ----------------
const ct = (iso) => Date.parse(iso); // ISO with explicit offset
const hhmmIn = (t, tz) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(t));
const allOn = () => P.cleanPrefs({ lead: 60, tz: 'America/New_York', sites: Object.fromEntries(Object.keys(P.PRESETS).map(id => ['x' + id, { on: true, preset: id }])) });

test('presets: off unless turned on, and identity (site, label, link, zone) always comes from the server table', () => {
  assert.deepEqual(P.cleanPrefs({ sites: { a: { preset: 'bink-bingo' }, b: { on: false, preset: 'bink-race' } } }).sites, {});
  const p = P.cleanPrefs({ tz: 'Europe/London', sites: {
    whatever: { on: true, preset: 'bink-bingo', site: 'Evil', label: '@everyone', url: 'https://evil.example/', tz: 'UTC' },
    g: { on: true, preset: 'bink-guess', anchor: '00:07' },
    n: { on: true, preset: 'nuts-giveaway', every: 7, anchor: 'nope' },
    u: { on: true, preset: 'not-a-preset' },
  } });
  assert.deepEqual(Object.keys(p.sites).sort(), ['preset:bink-bingo', 'preset:bink-guess', 'preset:nuts-giveaway']);
  assert.deepEqual(p.sites['preset:bink-bingo'], { on: true, preset: 'bink-bingo', site: 'Bink', label: 'Bingo', url: 'https://bink.bet/', tz: 'America/Chicago', times: ['10:00', '15:00', '18:00', '21:00'] });
  assert.equal(p.sites['preset:bink-guess'].anchor, '00:07', 'number guessing anchor is editable');
  assert.equal(p.sites['preset:bink-guess'].every, 20);
  assert.equal(p.sites['preset:nuts-giveaway'].every, 30, 'bad edits fall back to the preset');
  assert.equal(p.sites['preset:nuts-giveaway'].anchor, '00:00');
});

test('presets fire at the confirmed Central times (CST day), whatever zone the phone is in', () => {
  const e = { u: '1', subs: [], prefs: allOn(), timers: {} };
  const from = ct('2026-11-12T00:00:00-06:00'), to = ct('2026-11-12T23:59:00-06:00');
  const ready = sweep(e, from, to).filter(s => s.kind === 'ready' && s.sentAt >= from && s.sentAt <= to);
  const by = id => ready.filter(s => s.key === 'preset:' + id).map(s => hhmmIn(s.at, 'America/Chicago'));
  // the hourly cap never bites a single preset; check each one alone
  const solo = id => { const p = allOn(); p.sites = { ['preset:' + id]: p.sites['preset:' + id] }; return sweep({ u: '1', subs: [], prefs: p, timers: {} }, from, to).filter(s => s.kind === 'ready' && s.sentAt >= from && s.sentAt <= to).map(s => hhmmIn(s.at, 'America/Chicago')); };
  assert.deepEqual(solo('bink-bingo'), ['10:00', '15:00', '18:00', '21:00']);
  assert.deepEqual(solo('bink-freeroll'), ['13:00', '19:00']);
  const guess = solo('bink-guess'); assert.equal(guess.length, 72); assert.deepEqual(guess.slice(0, 4), ['00:00', '00:20', '00:40', '01:00']);
  const race = solo('bink-race'); assert.equal(race.length, 48); assert.deepEqual(race.slice(0, 3), ['00:05', '00:35', '01:05']);
  const nuts = solo('nuts-giveaway'); assert.equal(nuts.length, 48); assert.deepEqual(nuts.slice(0, 3), ['00:00', '00:30', '01:00']);
  assert.ok(by('bink-bingo').includes('10:00'));
});

test('preset labels are plain: "Bink: Bingo in 1 min", "Bink: Bingo now", and taps open the right place', () => {
  const p = P.cleanPrefs({ lead: 60, sites: { x: { on: true, preset: 'bink-bingo' } } });
  const e = { u: '1', subs: [], prefs: p, timers: {} };
  const ten = ct('2026-11-12T10:00:00-06:00');
  const soon = P.dueAt(e, ten / MIN - 1), now = P.dueAt(e, ten / MIN);
  assert.equal(P.line(soon[0]), 'Bink: Bingo in 1 min');
  assert.equal(P.line(now[0]), 'Bink: Bingo now');
  const m = P.message(now);
  assert.equal(m.title, 'Bink'); assert.equal(m.collect, 'https://bink.bet/'); assert.equal(m.key, 'preset:bink-bingo');
  assert.match(m.url, /#cc_site=Bink&cc_key=preset%3Abink-bingo$/);
  assert.equal(m.tag, 'cc-preset-bink-bingo');
  const n = P.cleanPrefs({ lead: 30, sites: { x: { on: true, preset: 'nuts-giveaway' } } });
  const nev = P.dueAt({ u: '1', subs: [], prefs: n, timers: {} }, ct('2026-11-12T10:30:00-06:00') / MIN - 1);
  assert.equal(P.line(nev[0]), 'Nuts.gg: Giveaway in 30 sec');
  assert.match(P.message(nev).url, /#cc_site=Nuts\.gg&cc_key=/, 'Nuts alert focuses the existing Nuts card');
  const g = P.cleanPrefs({ sites: { x: { on: true, preset: 'bink-guess' } } });
  assert.equal(P.line(P.dueAt({ u: '1', subs: [], prefs: g, timers: {} }, ct('2026-11-12T10:20:00-06:00') / MIN)[0]), 'Bink: Number guessing now');
});

test('DST: daily Central times stay on the wall clock across both 2026/2027 changes', () => {
  const tz = 'America/Chicago', rule = { times: ['10:00', '15:00', '18:00', '21:00'] };
  for (const day of ['2026-11-01', '2026-11-02', '2027-03-14', '2027-03-15', '2026-10-31', '2027-03-13']) {
    const got = P.recurringTimes(rule, tz, Date.parse(day + 'T00:00:00Z') - 12 * 3600e3, Date.parse(day + 'T00:00:00Z') + 36 * 3600e3)
      .filter(t => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(t)) === day).map(t => hhmmIn(t, tz));
    assert.deepEqual(got, ['10:00', '15:00', '18:00', '21:00'], day);
  }
  // 10:00 Central is 16:00 UTC in winter and 15:00 UTC in summer
  assert.equal(new Date(P.recurringTimes(rule, tz, Date.parse('2027-03-15T14:00:00Z'), Date.parse('2027-03-15T16:00:00Z'))[0]).toISOString(), '2027-03-15T15:00:00.000Z');
  assert.equal(new Date(P.recurringTimes(rule, tz, Date.parse('2026-11-02T14:00:00Z'), Date.parse('2026-11-02T17:00:00Z'))[0]).toISOString(), '2026-11-02T16:00:00.000Z');
});

test('DST: a window straddling the change uses each minute\'s own offset; skipped / repeated hours fire once', () => {
  const tz = 'America/Chicago';
  // Spring forward 2027-03-14 02:00 CST -> 03:00 CDT (08:00Z). A 02:30 daily time fires once, at the jump.
  const spring = P.recurringTimes({ times: ['02:30', '03:00'] }, tz, Date.parse('2027-03-14T07:50:00Z'), Date.parse('2027-03-14T08:10:00Z'));
  assert.deepEqual(spring.map(t => new Date(t).toISOString()), ['2027-03-14T08:00:00.000Z']);
  // Fall back 2026-11-01 02:00 CDT -> 01:00 CST (07:00Z). 01:30 happens twice on the wall; it fires once.
  const fall = P.recurringTimes({ times: ['01:30'] }, tz, Date.parse('2026-11-01T05:00:00Z'), Date.parse('2026-11-01T09:00:00Z'));
  assert.deepEqual(fall.map(t => new Date(t).toISOString()), ['2026-11-01T06:30:00.000Z']);
  // Short intervals follow real minutes straight through the change, with no gap and no double.
  const race = P.recurringTimes({ every: 30, anchor: '00:05' }, tz, Date.parse('2026-11-01T05:30:00Z'), Date.parse('2026-11-01T08:30:00Z'));
  assert.deepEqual(race.map(t => new Date(t).toISOString().slice(11, 16)), ['05:35', '06:05', '06:35', '07:05', '07:35', '08:05']);
  // Day-long sweep across fall back: every (site, kind, at) once, Bingo 4x on the day.
  const e = { u: '1', subs: [], prefs: P.cleanPrefs({ lead: 60, sites: { x: { on: true, preset: 'bink-bingo' }, y: { on: true, preset: 'bink-freeroll' } } }), timers: {} };
  const sent = sweep(e, Date.parse('2026-11-01T05:00:00Z'), Date.parse('2026-11-02T06:00:00Z'));
  const keys = sent.map(s => `${s.key}|${s.kind}|${s.at}`); assert.equal(new Set(keys).size, keys.length);
  assert.deepEqual(sent.filter(s => s.kind === 'ready').map(s => hhmmIn(s.at, tz)), ['10:00', '13:00', '15:00', '18:00', '19:00', '21:00']);
});

test('explicit times work for your own timers too, in the phone\'s zone', () => {
  const p = P.cleanPrefs({ tz: 'America/New_York', sites: { 'My drop': { on: true, custom: true, times: ['09:15', 'bad', '09:15', '20:00'] } } });
  assert.deepEqual(p.sites['My drop'].times, ['09:15', '20:00']);
  const got = P.recurringTimes(p.sites['My drop'], p.tz, Date.parse('2026-11-12T05:00:00Z'), Date.parse('2026-11-13T04:59:00Z')).map(t => hhmmIn(t, 'America/New_York'));
  assert.deepEqual(got, ['09:15', '20:00']);
});

test('all presets on: the hourly cap holds and a cron minute stays cheap', () => {
  const e = { u: '1', subs: [], prefs: allOn(), timers: {} };
  const from = ct('2026-11-12T09:00:00-06:00');
  const buckets = [...new Set(sweep(e, from, from + 180 * MIN).map(s => s.sentAt))];
  for (const b of buckets) assert.ok(buckets.filter(x => x <= b && x > b - 60 * MIN).length <= P.HOURLY_CAP);
  const t0 = performance.now(); for (let i = 0; i < 50; i++) P.dueAt(e, from / MIN + 200 + i); const per = (performance.now() - t0) / 50;
  assert.ok(per < 5, `dueAt per user per minute ${per.toFixed(2)} ms`);
});
