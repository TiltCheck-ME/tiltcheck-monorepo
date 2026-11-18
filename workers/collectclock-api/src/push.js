// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18
// CollectClock Web Push: VAPID (RFC 8292) + aes128gcm payload encryption (RFC 8291 / RFC 8188),
// written on WebCrypto only so it runs on Workers (no Node libs), plus the alert scheduler.
//
// Storage (KV binding CC, nothing new):
//   push:sub:<discordId>  {subs:[{endpoint,p256dh,auth,at}], prefs:{lead,quiet,tz,sites}}  written by /push/* endpoints
//   push:plan             {built, users:[{u,subs,prefs,timers}]}  written ONLY by the cron (single writer, no races)
//   push:dirty            ms timestamp; any /push/* change sets it so the next cron tick rebuilds the plan
// Timers come from the existing user:<discordId> sync record (the site's /sync PUT).
//
// Timing: one Cron Trigger every minute. Each run handles exactly one minute "bucket" (its scheduledTime),
// so a given alert belongs to one run only: that is the dedupe, and it costs no KV writes.
//   heads-up ("in 1 min" / "in 30 sec"): sent in the minute that contains endsAt - lead, so it lands 0-59 s
//     before that point (1 min lead arrives 60-119 s early; 30 s lead arrives 30-89 s early).
//   "ready now": sent in the first minute at or after endsAt, so it is never early and at most ~59 s late.
//   Fixed-clock timers (every N min from an anchor) end exactly on a minute, so their "now" is on time.
// Plus a few seconds of cron start jitter and push-service delivery time.

export const LEADS = [0, 30, 60];
export const EVERY = [5, 10, 15, 20, 30, 60, 120, 180, 240, 360, 480, 720, 1440];
export const HOURLY_CAP = 20;          // max pushes per user per rolling hour (coalesced pushes count once)
export const MAX_SENDS_PER_RUN = 40;   // Workers Free allows 50 outbound fetches per invocation
export const REBUILD_EVERY_MIN = 5;    // plan rebuild cadence (KV list + 2 reads per push user)
export const MAX_SUBS = 5;
const SITE_URL = 'https://tiltcheck-me.github.io/CollectClock/';
const PUSH_HOSTS = /(^|\.)(fcm\.googleapis\.com|android\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)$/i;

// ---------- bytes ----------
const te = new TextEncoder();
export function b64u(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function unb64u(str) {
  const s = String(str || '').replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '==='.slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const cat = (...parts) => { const n = parts.reduce((a, p) => a + p.length, 0), o = new Uint8Array(n); let i = 0; for (const p of parts) { o.set(p, i); i += p.length; } return o; };
async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}
function ecJwk(pubRaw, dRaw) {
  const j = { kty: 'EC', crv: 'P-256', x: b64u(pubRaw.slice(1, 33)), y: b64u(pubRaw.slice(33, 65)), ext: true };
  if (dRaw) j.d = b64u(dRaw);
  return j;
}

// ---------- RFC 8291 aes128gcm ----------
// opts.salt / opts.asPublic+asPrivate let tests pin the RFC 8291 example; normal sends generate fresh ones.
export async function encryptPayload(plaintext, p256dh, authSecret, opts = {}) {
  const uaPub = typeof p256dh === 'string' ? unb64u(p256dh) : p256dh;
  const auth = typeof authSecret === 'string' ? unb64u(authSecret) : authSecret;
  if (uaPub.length !== 65 || uaPub[0] !== 4) throw new Error('bad p256dh');
  if (auth.length !== 16) throw new Error('bad auth');
  const data = typeof plaintext === 'string' ? te.encode(plaintext) : plaintext;
  let asPriv, asPub;
  if (opts.asPrivate) {
    asPub = typeof opts.asPublic === 'string' ? unb64u(opts.asPublic) : opts.asPublic;
    asPriv = await crypto.subtle.importKey('jwk', ecJwk(asPub, unb64u(opts.asPrivate)), { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  } else {
    const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    asPriv = kp.privateKey; asPub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  }
  // importKey validates that the receiver key is a real P-256 point (RFC 8291 section 7).
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asPriv, 256));
  const salt = opts.salt ? (typeof opts.salt === 'string' ? unb64u(opts.salt) : opts.salt) : crypto.getRandomValues(new Uint8Array(16));
  const prkKey = await hmac(auth, ecdh);
  const ikm = await hmac(prkKey, cat(te.encode('WebPush: info\0'), uaPub, asPub, new Uint8Array([1])));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(te.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(te.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, cat(data, new Uint8Array([2]))));
  const rs = 4096;
  const header = cat(salt, new Uint8Array([rs >>> 24, (rs >>> 16) & 255, (rs >>> 8) & 255, rs & 255, 65]), asPub);
  return cat(header, ct);
}
// Receiver side, used by tests to round-trip (not used in production).
export async function decryptPayload(body, uaPrivate, uaPublic, authSecret) {
  const uaPub = typeof uaPublic === 'string' ? unb64u(uaPublic) : uaPublic;
  const auth = typeof authSecret === 'string' ? unb64u(authSecret) : authSecret;
  const salt = body.slice(0, 16), idlen = body[20], asPub = body.slice(21, 21 + idlen), ct = body.slice(21 + idlen);
  const priv = await crypto.subtle.importKey('jwk', ecJwk(uaPub, unb64u(uaPrivate)), { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const asKey = await crypto.subtle.importKey('raw', asPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, priv, 256));
  const ikm = await hmac(await hmac(auth, ecdh), cat(te.encode('WebPush: info\0'), uaPub, asPub, new Uint8Array([1])));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(te.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(te.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ct));
  let end = pt.length - 1; while (end >= 0 && pt[end] === 0) end--;
  if (pt[end] !== 2) throw new Error('bad padding delimiter');
  return pt.slice(0, end);
}

// ---------- RFC 8292 VAPID ----------
const jwtCache = new Map(); // audience -> {token, exp}; reused across runs in the same isolate
export async function vapidAuth(endpoint, env, now = Date.now()) {
  const aud = new URL(endpoint).origin;
  const hit = jwtCache.get(aud);
  if (hit && hit.exp - 3600 > now / 1000) return hit.header;
  const pub = unb64u(env.VAPID_PUBLIC), d = unb64u(env.VAPID_PRIVATE);
  const key = await crypto.subtle.importKey('jwk', ecJwk(pub, d), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const exp = Math.floor(now / 1000) + 12 * 3600;
  const unsigned = b64u(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))) + '.' +
    b64u(te.encode(JSON.stringify({ aud, exp, sub: env.VAPID_SUBJECT || SITE_URL })));
  // WebCrypto ECDSA returns r||s (IEEE P1363), which is exactly the JWS ES256 signature format.
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(unsigned)));
  const header = `vapid t=${unsigned}.${b64u(sig)}, k=${env.VAPID_PUBLIC}`;
  jwtCache.set(aud, { header, exp });
  return header;
}

export async function sendPush(env, sub, payload, opts = {}) {
  const body = await encryptPayload(JSON.stringify(payload), sub.p256dh, sub.auth);
  const headers = {
    Authorization: await vapidAuth(sub.endpoint, env),
    'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream',
    TTL: String(opts.ttl ?? 120), Urgency: 'high',
  };
  if (opts.topic) headers.Topic = opts.topic; // replaces an undelivered push with the same topic
  const r = await (opts.fetch || fetch)(sub.endpoint, { method: 'POST', headers, body });
  return r.status;
}
export const isGone = s => s === 404 || s === 410;

// ---------- validation ----------
export function cleanSub(s) {
  try {
    const u = new URL(String(s.endpoint || ''));
    if (u.protocol !== 'https:' || !PUSH_HOSTS.test(u.hostname) || u.href.length > 1000) return null;
    const p = unb64u(s.keys && s.keys.p256dh), a = unb64u(s.keys && s.keys.auth);
    if (p.length !== 65 || p[0] !== 4 || a.length !== 16) return null;
    return { endpoint: u.href, p256dh: b64u(p), auth: b64u(a) };
  } catch { return null; }
}
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
// Built-in site schedules (confirmed by Jamie, Nov 12 2026). All America/Chicago wall-clock times, DST-aware.
// The client sends {on, preset, every/anchor or times}; site, label, link and zone always come from here.
export const PRESET_TZ = 'America/Chicago';
export const PRESETS = {
  'nuts-giveaway': { site: 'Nuts.gg', label: 'Giveaway', every: 30, anchor: '00:00', url: 'https://nuts.gg/play/jmenichole' },
  'bink-bingo': { site: 'Bink', label: 'Bingo', times: ['10:00', '15:00', '18:00', '21:00'], url: 'https://bink.bet/' },
  'bink-freeroll': { site: 'Bink', label: 'Freeroll', times: ['13:00', '19:00'], url: 'https://bink.bet/' },
  'bink-guess': { site: 'Bink', label: 'Number guessing', every: 20, anchor: '00:00', url: 'https://bink.bet/' },
  'bink-race': { site: 'Bink', label: 'Race', every: 30, anchor: '00:05', url: 'https://bink.bet/' },
};
export const MAX_TIMES = 24;
export function cleanTimes(t) {
  if (!Array.isArray(t)) return null;
  const out = [...new Set(t.map(String).filter(x => HHMM.test(x)))].sort().slice(0, MAX_TIMES);
  return out.length ? out : null;
}
export function validTz(tz) { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; } }
export function cleanPrefs(p, httpUrl) {
  p = p || {};
  const out = { lead: LEADS.includes(Number(p.lead)) ? Number(p.lead) : 60, tz: validTz(p.tz) ? String(p.tz) : 'UTC', quiet: { on: false, start: '23:00', end: '08:00' }, sites: {} };
  if (p.quiet) out.quiet = { on: !!p.quiet.on, start: HHMM.test(p.quiet.start) ? p.quiet.start : '23:00', end: HHMM.test(p.quiet.end) ? p.quiet.end : '08:00' };
  const sites = p.sites && typeof p.sites === 'object' ? Object.entries(p.sites).slice(0, 150) : [];
  for (const [name0, s] of sites) {
    const name = String(name0).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 60);
    if (!name || !s || !s.on) continue; // only opted-in sites are stored; default is off
    const r = { on: true };
    const preset = s.preset && Object.prototype.hasOwnProperty.call(PRESETS, s.preset) ? PRESETS[s.preset] : null;
    if (s.preset && !preset) continue; // unknown preset id: drop it rather than guess
    if (preset) {
      // Editable schedule, fixed identity: the user may move the anchor / times, never the site, label, link or zone.
      r.preset = s.preset; r.site = preset.site; r.label = preset.label; r.url = preset.url; r.tz = PRESET_TZ;
      if (preset.times) r.times = cleanTimes(s.times) || preset.times.slice();
      else { r.every = EVERY.includes(Number(s.every)) ? Number(s.every) : preset.every; r.anchor = HHMM.test(s.anchor) ? s.anchor : preset.anchor; }
      out.sites['preset:' + s.preset] = r;
      continue;
    }
    const times = cleanTimes(s.times);
    if (times) r.times = times;
    else if (EVERY.includes(Number(s.every)) && HHMM.test(s.anchor)) { r.every = Number(s.every); r.anchor = s.anchor; }
    if (s.label) r.label = String(s.label).replace(/[\u0000-\u001f@]/g, ' ').trim().slice(0, 24);
    if (s.custom) { if (!r.every && !r.times) continue; r.custom = true; const u = httpUrl ? httpUrl(s.url) : null; if (u) r.url = u; }
    out.sites[name] = r;
  }
  return out;
}

// ---------- time helpers ----------
// Offsets only change on quarter-hour UTC boundaries (every IANA zone in use), so cache per (zone, 15 min).
// Keeps the per-minute cron well inside the Workers Free CPU budget.
const fmtCache = new Map(), offCache = new Map();
export function tzOffsetMin(tz, ms) {
  const q = Math.floor(ms / 900000), ck = tz + '|' + q;
  const hit = offCache.get(ck); if (hit !== undefined) return hit;
  let v = 0;
  try {
    let f = fmtCache.get(tz);
    if (!f) { f = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }); fmtCache.set(tz, f); }
    const s = f.formatToParts(new Date(q * 900000)).find(p => p.type === 'timeZoneName').value;
    const m = s.match(/GMT([+-])(\d{2}):?(\d{2})?/);
    if (m) v = (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0));
  } catch { v = 0; }
  if (offCache.size > 5000) offCache.clear();
  offCache.set(ck, v);
  return v;
}
const hm = s => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
const mod = (a, n) => ((a % n) + n) % n;
export function localMinuteOfDay(ms, tz) { return mod(Math.floor(ms / 60000) + tzOffsetMin(tz, ms), 1440); }
export function inQuiet(prefs, ms) {
  const q = prefs.quiet; if (!q || !q.on) return false;
  const m = localMinuteOfDay(ms, prefs.tz), a = hm(q.start), b = hm(q.end);
  if (a === b) return false;
  return a < b ? (m >= a && m < b) : (m >= a || m < b); // wraps midnight, e.g. 23:00-08:00
}
// Occurrences of a fixed-clock rule within [from, to] (ms), always on a whole minute.
//   {every: N, anchor: 'HH:MM'}: every N minutes lined up with HH:MM local (N divides a day).
//   {times: ['HH:MM', ...]}: those local wall-clock times every day.
// Each minute is tested against its OWN UTC offset, so a window that straddles a DST change is still right.
// "Daily" rules (explicit times, or an interval of 2 h or more) follow the wall clock across DST:
//   spring forward: a time in the skipped hour (02:30) fires once, at the jump (03:00 local);
//   fall back: a time in the repeated hour (01:30) fires once, the first time it happens.
// Short intervals (60 min or less) just follow the real minutes, so both copies of a repeated hour count.
export function recurringTimes(rule, tz, from, to) {
  const out = [], times = rule.times ? new Set(rule.times.map(hm)) : null;
  const I = rule.every, A = rule.anchor ? hm(rule.anchor) : 0;
  const daily = !!times || I >= 120;
  const hit = lm => (times ? times.has(lm) : mod(lm - A, I) === 0);
  for (let t = Math.ceil(from / 60000) * 60000; t <= to; t += 60000) {
    const o = tzOffsetMin(tz, t), lm = mod(t / 60000 + o, 1440);
    if (!daily) { if (hit(lm)) out.push(t); continue; }
    const before = tzOffsetMin(tz, t - 60000);
    if (o > before) { // spring forward at t: local minutes lm-gap .. lm-1 never happen today; fire them now
      let any = hit(lm); for (let g = 1; g <= o - before && !any; g++) any = hit(mod(lm - g, 1440));
      if (any) out.push(t);
      continue;
    }
    if (!hit(lm)) continue;
    const old = tzOffsetMin(tz, t - 180 * 60000);
    if (old > o && tzOffsetMin(tz, t - (old - o) * 60000) === old) continue; // repeated hour: already fired
    out.push(t);
  }
  return out;
}
export const isFixed = rule => !!(rule && (rule.every || rule.times));

// ---------- scheduler (pure) ----------
// Events one user owes in minute bucket b (b = epoch minutes; the run at b*60000 sends them).
export function eventsAt(entry, b) {
  const prefs = entry.prefs, lead = prefs.lead || 0, S = b * 60000, ev = [], seen = new Set();
  for (const [name, rule] of Object.entries(prefs.sites || {})) {
    if (!rule.on) continue;
    let ends;
    if (isFixed(rule)) ends = recurringTimes(rule, rule.tz || prefs.tz, S - lead * 1000 - 60000, S + lead * 1000 + 60000);
    else { const e = entry.timers && entry.timers[name]; ends = e ? [e] : []; }
    for (const T of ends) {
      if (lead && Math.floor((T - lead * 1000) / 60000) === b) add(name, rule, 'soon', T);
      if (Math.ceil(T / 60000) === b) add(name, rule, 'ready', T);
    }
  }
  function add(name, rule, kind, T) { const k = name + '|' + kind; if (seen.has(k)) return; seen.add(k); ev.push({ key: name, site: rule.site || name, kind, at: T, label: rule.label || '', url: rule.url || '', lead }); }
  return ev;
}
// Events after quiet hours and the hourly cap. Deterministic, so every run agrees without storing anything.
export function dueAt(entry, b) {
  if (inQuiet(entry.prefs, b * 60000)) return [];
  const ev = eventsAt(entry, b);
  if (!ev.length) return ev;
  let sent = 0;
  for (let k = b - 59; k < b; k++) if (!inQuiet(entry.prefs, k * 60000) && eventsAt(entry, k).length) sent++;
  return sent >= HOURLY_CAP ? [] : ev;
}
export function line(e) {
  const when = e.lead === 30 ? '30 sec' : '1 min';
  if (e.kind === 'soon') return `${e.site}: ${e.label ? e.label + ' in' : 'ready in'} ${when}`;
  return `${e.site}: ${e.label ? e.label + ' now' : 'ready now'}`;
}
export function message(events) {
  const first = events[0];
  const lines = events.slice(0, 3).map(line);
  if (events.length > 3) lines.push(`and ${events.length - 3} more`);
  return {
    title: events.length === 1 ? first.site : 'CollectClock',
    body: events.length === 1 ? line(first) : lines.join('\n'),
    tag: events.length === 1 ? 'cc-' + (first.key || first.site).toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'cc-multi',
    site: first.site,
    key: first.key || first.site,
    collect: first.url || '',
    url: SITE_URL + '#cc_site=' + encodeURIComponent(first.site) + (first.key && first.key !== first.site ? '&cc_key=' + encodeURIComponent(first.key) : ''),
    ts: first.at,
  };
}

// ---------- plan + cron ----------
export async function rebuildPlan(env, now = Date.now(), opt = {}) {
  const users = [];
  let cursor;
  do {
    const page = await env.CC.list({ prefix: 'push:sub:', cursor });
    for (const k of page.keys) {
      const rec = JSON.parse((await env.CC.get(k.name)) || 'null');
      if (!rec || !rec.subs || !rec.subs.length || !rec.prefs || !Object.keys(rec.prefs.sites || {}).length) continue;
      const u = k.name.slice('push:sub:'.length);
      const sync = JSON.parse((await env.CC.get('user:' + u)) || '{}');
      const timers = {};
      for (const name of Object.keys(rec.prefs.sites)) {
        const t = sync.timers && sync.timers[name];
        if (t && Number(t.endsAt) > now - 5 * 60000) timers[name] = Number(t.endsAt);
      }
      users.push({ u, subs: rec.subs.map(s => ({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })), prefs: rec.prefs, timers });
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  // built = wall clock, so a /push/* change that lands while this runs still marks the plan stale.
  const plan = { built: Date.now(), users };
  if (!opt.force) {
    const prev = await env.CC.get('push:plan');
    let same = false; try { same = !!prev && JSON.stringify(JSON.parse(prev).users) === JSON.stringify(users); } catch {}
    if (same) { plan.built = JSON.parse(prev).built; return plan; } // unchanged: skip the write (KV writes are the scarce quota)
  }
  await env.CC.put('push:plan', JSON.stringify(plan));
  return plan;
}

export async function removeSubs(env, uid, endpoints) {
  const k = 'push:sub:' + uid;
  const rec = JSON.parse((await env.CC.get(k)) || 'null');
  if (!rec) return;
  const before = rec.subs.length;
  rec.subs = rec.subs.filter(s => !endpoints.includes(s.endpoint));
  if (rec.subs.length !== before) await env.CC.put(k, JSON.stringify(rec));
}

export async function pushTick(env, scheduledTime, deps = {}) {
  if (!env.VAPID_PUBLIC || !env.VAPID_PRIVATE) return { skipped: 'no vapid keys' };
  const b = Math.round(scheduledTime / 60000);
  const raw = await env.CC.get('push:plan');
  let plan = raw ? JSON.parse(raw) : null;
  const dirty = Number((await env.CC.get('push:dirty')) || 0);
  if (!plan || dirty > (plan.built || 0)) plan = await rebuildPlan(env, scheduledTime, { force: true });
  else if (b % REBUILD_EVERY_MIN === 0) plan = await rebuildPlan(env, scheduledTime);
  const send = deps.send || ((sub, msg, o) => sendPush(env, sub, msg, o));
  let sends = 0; const dead = {}; const report = [];
  for (const entry of plan.users) {
    const ev = dueAt(entry, b);
    if (!ev.length) continue;
    const msg = message(ev);
    for (const sub of entry.subs) {
      if (sends >= MAX_SENDS_PER_RUN) { report.push({ u: entry.u, skipped: 'run cap' }); continue; }
      sends++;
      let status = 0;
      try { status = await send(sub, msg, { ttl: 120, topic: msg.tag.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) }); } catch { status = -1; }
      report.push({ u: entry.u, status, n: ev.length });
      if (isGone(status)) (dead[entry.u] ||= []).push(sub.endpoint);
    }
  }
  const deadUsers = Object.keys(dead);
  if (deadUsers.length) {
    for (const u of deadUsers) await removeSubs(env, u, dead[u]);
    for (const e of plan.users) if (dead[e.u]) e.subs = e.subs.filter(s => !dead[e.u].includes(s.endpoint));
    plan.users = plan.users.filter(e => e.subs.length);
    await env.CC.put('push:plan', JSON.stringify(plan));
  }
  return { bucket: b, sends, dead: deadUsers.reduce((a, u) => a + dead[u].length, 0), report };
}

// ---------- HTTP ----------
// h = helpers from index.js: { json, userFor, limited, httpUrl }
export async function handlePush(req, env, url, h) {
  const p = url.pathname;
  if (p === '/push/key' && req.method === 'GET') return h.json({ publicKey: env.VAPID_PUBLIC || null });
  const uid = await h.userFor(env, req);
  if (!uid) return h.json({ error: 'sign in with Discord first' }, 401);
  const k = 'push:sub:' + uid;
  const rec = JSON.parse((await env.CC.get(k)) || 'null') || { subs: [], prefs: cleanPrefs({}) };
  const body = async () => { try { return JSON.parse((await req.text()).slice(0, 30000)); } catch { return null; } };
  const dirty = () => env.CC.put('push:dirty', String(Date.now()));

  if (p === '/push/prefs' && req.method === 'GET') return h.json({ prefs: rec.prefs, devices: rec.subs.length });
  if (p === '/push/prefs' && req.method === 'PUT') {
    if (await h.limited(env, 'pushp:' + uid, 150, 86400)) return h.json({ error: 'slow down' }, 429);
    const b = await body(); if (!b) return h.json({ error: 'bad json' }, 400);
    rec.prefs = cleanPrefs(b.prefs, h.httpUrl);
    await env.CC.put(k, JSON.stringify(rec)); await dirty();
    return h.json({ ok: true, prefs: rec.prefs });
  }
  if (p === '/push/subscribe' && req.method === 'POST') {
    if (await h.limited(env, 'pushs:' + uid, 30, 86400)) return h.json({ error: 'slow down' }, 429);
    const b = await body(); const s = b && cleanSub(b.subscription || {});
    if (!s) return h.json({ error: 'That push subscription was not accepted.' }, 400);
    rec.subs = rec.subs.filter(x => x.endpoint !== s.endpoint);
    rec.subs.push({ ...s, at: Date.now() });
    rec.subs = rec.subs.slice(-MAX_SUBS);
    if (b.prefs) rec.prefs = cleanPrefs(b.prefs, h.httpUrl);
    await env.CC.put(k, JSON.stringify(rec)); await dirty();
    return h.json({ ok: true, devices: rec.subs.length });
  }
  if (p === '/push/unsubscribe' && req.method === 'POST') {
    const b = await body(); const ep = b && String(b.endpoint || '');
    rec.subs = ep ? rec.subs.filter(x => x.endpoint !== ep) : [];
    await env.CC.put(k, JSON.stringify(rec)); await dirty();
    return h.json({ ok: true, devices: rec.subs.length });
  }
  if (p === '/push/test' && req.method === 'POST') {
    if (!env.VAPID_PUBLIC || !env.VAPID_PRIVATE) return h.json({ error: 'Push is not set up on the server yet.' }, 503);
    if (await h.limited(env, 'pusht:' + uid, 5, 3600)) return h.json({ error: 'slow down' }, 429);
    if (!rec.subs.length) return h.json({ error: 'No devices with alerts on.' }, 400);
    const msg = { title: 'CollectClock', body: 'Test alert. Alerts are on for this device.', tag: 'cc-test', site: '', collect: '', url: SITE_URL, ts: Date.now() };
    const out = [], dead = [];
    for (const s of rec.subs) { let st = 0; try { st = await sendPush(env, s, msg, { ttl: 60 }); } catch { st = -1; } out.push(st); if (isGone(st)) dead.push(s.endpoint); }
    if (dead.length) { await removeSubs(env, uid, dead); await dirty(); }
    return h.json({ ok: out.some(s => s >= 200 && s < 300), statuses: out, removed: dead.length });
  }
  return h.json({ error: 'not found' }, 404);
}
