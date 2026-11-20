// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18
// Cash-out Buddy: mutual opt-in pairing and privacy-safe pings between two signed-in CollectClock/TiltCheck users.
//
// Who is who: the caller is the Discord id behind their Bearer session (sess:<token>, the same login as /sync, /me, /push/*).
//
// Storage (KV binding CC, nothing new to create):
//   buddy:u:<discordId>       {pairs:[{u:<buddy discordId>, at}]}      both sides are written on accept and on unpair
//   buddy:inv:<CODE>          {from:<discordId>, exp}                  one-time invite code, TTL 24 h
//   buddy:myinv:<discordId>   {code, exp}                              the caller's live code (a new one replaces it), TTL 24 h
//   buddy:rl:<idA>:<idB>      '1'                                      ping rate limit per pair (ids sorted), TTL 10 min
//   buddy:name:<discordId>    display name from Discord, TTL 1 day
//
// Delivery is a plain-text bot DM. Buttons (Nudge / Join voice), Web Push, and any message on accept or unpair
// are open product questions for Jamie and are deliberately not built.
//
// Privacy (hard rule): a ping carries no amount, balance, game, casino or site. The request body may hold only
// {type:'buddy_ping', reason:'walk_away'|'tilt'}; anything else is rejected. Delivered copy is fixed:
//   "<name> hit their walk-away."  or  "<name> could use a nudge."

export const BUDDY_MAX = 3;                       // buddies per player (placeholder; open question for Jamie)
export const BUDDY_PING_GAP_S = 600;              // one ping per 10 min per pair (the brief's example; open question)
export const BUDDY_INVITE_TTL_S = 86400;
export const BUDDY_REASONS = { walk_away: 'hit their walk-away', tilt: 'could use a nudge' };
const BUDDY_CODE_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
// Field names that smell like money or location. A ping body with any extra field is refused anyway;
// these get the explicit privacy error.
const BUDDY_MONEYISH = /amount|bal|profit|loss|pnl|win|bet|wager|stake|usd|sol|coin|deposit|withdraw|cash|game|casino|site|host|url|score|risk|peak|initial/i;

// ---------- pure helpers (tested directly) ----------
export function buddyNewCode(rand = crypto.getRandomValues(new Uint8Array(8))) {
  let s = ''; for (let i = 0; i < 8; i++) s += BUDDY_CODE_ABC[rand[i] % BUDDY_CODE_ABC.length];
  return s.slice(0, 4) + '-' + s.slice(4);
}
export function buddyNormCode(v) {
  const s = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length !== 8 || [...s].some(c => !BUDDY_CODE_ABC.includes(c))) return null;
  return s.slice(0, 4) + '-' + s.slice(4);
}
/** Validate a ping body. Returns {reason} or {error}. Only {type?, reason} is allowed. */
export function buddyCheckPing(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { error: 'bad json' };
  for (const k of Object.keys(b)) {
    if (k === 'type' || k === 'reason') continue;
    return { error: BUDDY_MONEYISH.test(k) ? 'Buddy pings never carry amounts, balances, games or sites.' : 'Unexpected field in a buddy ping.' };
  }
  if (b.type !== undefined && b.type !== 'buddy_ping') return { error: 'Unexpected ping type.' };
  if (typeof b.reason !== 'string' || !Object.prototype.hasOwnProperty.call(BUDDY_REASONS, b.reason)) return { error: 'reason must be walk_away or tilt' };
  return { reason: b.reason };
}
const buddyClean = (v, n) => String(v || '').replace(/[\u0000-\u001f]/g, ' ').replace(/[@*_~`|>\\]/g, '').trim().slice(0, n);
/** The only text a buddy ever sees about a ping. */
export function buddyPingText(name, reason) {
  return `${buddyClean(name, 40) || 'Your buddy'} ${BUDDY_REASONS[reason]}.`;
}

// ---------- KV ----------
async function buddyGetJ(env, k) { try { return JSON.parse((await env.CC.get(k)) || 'null'); } catch { return null; } }
async function buddyRec(env, uid) { const r = await buddyGetJ(env, 'buddy:u:' + uid); return r && Array.isArray(r.pairs) ? r : { pairs: [] }; }
async function buddySave(env, uid, rec) {
  if (rec.pairs.length) await env.CC.put('buddy:u:' + uid, JSON.stringify(rec)); else await env.CC.delete('buddy:u:' + uid);
}

// ---------- Discord ----------
async function buddyName(env, uid, f) {
  const c = await env.CC.get('buddy:name:' + uid);
  if (c) return c;
  if (!env.BOT_TOKEN) return '';
  try {
    const r = await f(`https://discord.com/api/v10/users/${uid}`, { headers: { Authorization: 'Bot ' + env.BOT_TOKEN } });
    if (!r.ok) return '';
    const u = await r.json();
    const n = buddyClean(u.global_name || u.username || '', 40);
    if (n) await env.CC.put('buddy:name:' + uid, n, { expirationTtl: 86400 });
    return n;
  } catch { return ''; }
}
/** DM a user from the bot. Returns the HTTP status of the send (0 = no bot token, -1 = network error). */
export async function buddyDm(env, uid, msg, f = fetch) {
  if (!env.BOT_TOKEN) return 0;
  const H = { Authorization: 'Bot ' + env.BOT_TOKEN, 'Content-Type': 'application/json' };
  try {
    const ch = await f('https://discord.com/api/v10/users/@me/channels', { method: 'POST', headers: H, body: JSON.stringify({ recipient_id: uid }) });
    if (!ch.ok) return ch.status;
    const { id } = await ch.json();
    const r = await f(`https://discord.com/api/v10/channels/${id}/messages`, { method: 'POST', headers: H,
      body: JSON.stringify({ ...msg, allowed_mentions: { parse: [] } }) });
    return r.status;
  } catch { return -1; }
}

// ---------- HTTP ----------
// h = helpers from index.js: { json, userFor, limited, hashId, fetch? }
export async function handleBuddy(req, env, url, h) {
  const p = url.pathname;
  const f = h.fetch || fetch;

  const uid = await h.userFor(env, req);
  if (!uid) return h.json({ error: 'sign in with Discord first' }, 401);
  const body = async () => { try { const s = await req.text(); if (s.length > 500) return null; return JSON.parse(s || '{}'); } catch { return null; } };
  const rec = await buddyRec(env, uid);

  if (p === '/buddy/status' && req.method === 'GET') {
    const buddies = [];
    for (const x of rec.pairs) buddies.push({ id: await h.hashId(x.u), name: (await buddyName(env, x.u, f)) || 'Your buddy', since: x.at });
    const inv = await buddyGetJ(env, 'buddy:myinv:' + uid);
    return h.json({ paired: buddies.length > 0, count: buddies.length, max: BUDDY_MAX, buddies,
      invite: inv && inv.exp > Date.now() ? { code: inv.code, expiresAt: new Date(inv.exp).toISOString() } : null });
  }

  if (p === '/buddy/invite' && req.method === 'POST') {
    if (rec.pairs.length >= BUDDY_MAX) return h.json({ error: `You already have ${BUDDY_MAX} buddies. Unpair one first.` }, 409);
    if (await h.limited(env, 'buddyi:' + uid, 10, 86400)) return h.json({ error: 'slow down' }, 429);
    const old = await buddyGetJ(env, 'buddy:myinv:' + uid);
    if (old && old.code) await env.CC.delete('buddy:inv:' + old.code);
    const code = buddyNewCode(), exp = Date.now() + BUDDY_INVITE_TTL_S * 1000;
    await env.CC.put('buddy:inv:' + code, JSON.stringify({ from: uid, exp }), { expirationTtl: BUDDY_INVITE_TTL_S });
    await env.CC.put('buddy:myinv:' + uid, JSON.stringify({ code, exp }), { expirationTtl: BUDDY_INVITE_TTL_S });
    return h.json({ ok: true, code, expiresAt: new Date(exp).toISOString() });
  }

  if (p === '/buddy/accept' && req.method === 'POST') {
    if (await h.limited(env, 'buddya:' + uid, 20, 3600)) return h.json({ error: 'slow down' }, 429);
    const b = await body(); if (!b) return h.json({ error: 'bad json' }, 400);
    const code = buddyNormCode(b.code);
    if (!code) return h.json({ error: 'That code does not look right (8 letters/numbers).' }, 400);
    const inv = await buddyGetJ(env, 'buddy:inv:' + code);
    if (!inv || !inv.from || inv.exp < Date.now()) return h.json({ error: 'That code is not valid or has expired.' }, 404);
    if (inv.from === uid) return h.json({ error: 'That is your own code. Send it to your buddy.' }, 400);
    const other = await buddyRec(env, inv.from);
    if (rec.pairs.some(x => x.u === inv.from)) return h.json({ ok: true, already: true });
    if (rec.pairs.length >= BUDDY_MAX) return h.json({ error: `You already have ${BUDDY_MAX} buddies. Unpair one first.` }, 409);
    if (other.pairs.length >= BUDDY_MAX) return h.json({ error: 'They already have the most buddies allowed.' }, 409);
    const at = Date.now();
    rec.pairs.push({ u: inv.from, at }); other.pairs = other.pairs.filter(x => x.u !== uid); other.pairs.push({ u: uid, at });
    await buddySave(env, uid, rec); await buddySave(env, inv.from, other);
    await env.CC.delete('buddy:inv:' + code); await env.CC.delete('buddy:myinv:' + inv.from);
    return h.json({ ok: true, buddy: { id: await h.hashId(inv.from), name: (await buddyName(env, inv.from, f)) || 'Your buddy' } });
  }

  if (p === '/buddy/unpair' && req.method === 'POST') {
    const b = await body(); if (!b) return h.json({ error: 'bad json' }, 400);
    const keep = [], gone = [];
    for (const x of rec.pairs) { if (!b.buddy || (await h.hashId(x.u)) === String(b.buddy)) gone.push(x.u); else keep.push(x); }
    if (b.buddy && !gone.length) return h.json({ error: 'not found' }, 404);
    rec.pairs = keep; await buddySave(env, uid, rec);
    for (const o of gone) { const r = await buddyRec(env, o); r.pairs = r.pairs.filter(x => x.u !== uid); await buddySave(env, o, r); }
    return h.json({ ok: true, removed: gone.length, count: keep.length });
  }

  if (p === '/buddy/ping' && req.method === 'POST') {
    const b = await body(); if (!b) return h.json({ error: 'bad json' }, 400);
    const chk = buddyCheckPing(b);
    if (chk.error) return h.json({ error: chk.error }, 400);
    if (!rec.pairs.length) return h.json({ error: 'No buddy yet. Pair up in the extension first.' }, 409);
    if (await h.limited(env, 'buddyp:' + uid, 30, 86400)) return h.json({ error: 'slow down' }, 429);
    const name = await buddyName(env, uid, f);
    const text = buddyPingText(name, chk.reason);
    let sent = 0, skipped = 0, failed = 0;
    for (const x of rec.pairs) {
      const rl = 'buddy:rl:' + [uid, x.u].sort().join(':');
      if (await env.CC.get(rl)) { skipped++; continue; }
      await env.CC.put(rl, '1', { expirationTtl: BUDDY_PING_GAP_S });
      const st = await buddyDm(env, x.u, { content: text }, f);
      if (st >= 200 && st < 300) sent++;
      else { failed++; await env.CC.delete(rl); }
    }
    if (!sent && skipped && !failed) return h.json({ error: 'You pinged your buddy in the last 10 minutes.', sent, skipped, failed }, 429);
    if (!sent && failed) return h.json({ error: 'Could not reach your buddy on Discord. They may need to join the TiltCheck server or open their DMs.', sent, skipped, failed }, 502);
    return h.json({ ok: true, sent, skipped, failed });
  }

  return h.json({ error: 'not found' }, 404);
}
