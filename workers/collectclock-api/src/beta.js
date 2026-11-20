// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-19
// Opt-in anonymous beta counts from the TiltCheck extension (apps/chrome-extension/src/beta-telemetry.ts).
// POST /beta/counts { schema: 1, version, day, counts } adds to that day's totals for that version.
// Privacy: this route never reads or stores the IP, headers (beyond Content-Type/Length), user agent,
// cookies or any identifier, and logs nothing. Only the summed numbers are kept.

export const BETA_EVENTS = ['install', 'nudge_shown', 'break_taken', 'keep_win_hold', 'cash_out', 'ask_question', 'protection_turned_off'];
export const BETA_MAX_BODY = 1024;          // bytes; a real batch is ~200
export const BETA_MAX_COUNT = 10000;        // per event per batch
export const BETA_MAX_VERSIONS_PER_DAY = 20;
export const BETA_MAX_BATCHES_PER_DAY = 2000;
export const BETA_TTL = 400 * 86400;        // keep daily totals ~13 months
const VERSION_RE = /^(?:\d{1,4}(?:\.\d{1,4}){0,3}|unknown)$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400000;

const isoDay = t => new Date(t).toISOString().slice(0, 10);

/** Strictly validate a parsed body. Returns { version, day, counts } or null. */
export function validateBetaBatch(b, now = Date.now()) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
  const keys = Object.keys(b);
  if (keys.length !== 4 || !['schema', 'version', 'day', 'counts'].every(k => keys.includes(k))) return null;
  if (b.schema !== 1) return null;
  if (typeof b.version !== 'string' || b.version.length > 20 || !VERSION_RE.test(b.version)) return null;
  if (typeof b.day !== 'string' || !DAY_RE.test(b.day)) return null;
  const t = Date.parse(b.day + 'T00:00:00Z');
  if (!Number.isFinite(t) || isoDay(t) !== b.day) return null;            // rejects 2026-02-30
  const today = Date.parse(isoDay(now) + 'T00:00:00Z');
  if (t < today - 2 * DAY_MS || t > today + DAY_MS) return null;           // today, +/- clock skew
  const c = b.counts;
  if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
  const names = Object.keys(c);
  if (names.length === 0 || names.length > BETA_EVENTS.length) return null;
  const counts = {};
  for (const n of names) {
    if (!BETA_EVENTS.includes(n)) return null;
    const v = c[n];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > BETA_MAX_COUNT) return null;
    counts[n] = v;
  }
  return { version: b.version, day: b.day, counts };
}

// One KV key per UTC day, holding totals per extension version: bc:<day> = { v: { <version>: { batches, counts } } }.
// One read + one write per accepted batch. Concurrent batches can race (last write wins); fine for beta counts.
export async function addBetaBatch(env, batch) {
  const k = 'bc:' + batch.day;
  let doc; try { doc = JSON.parse((await env.CC.get(k)) || '{}'); } catch { doc = {}; }
  if (!doc.v || typeof doc.v !== 'object') doc.v = {};
  let total = 0; for (const x of Object.values(doc.v)) total += x.batches || 0;
  if (total >= BETA_MAX_BATCHES_PER_DAY) return 'full';
  if (!doc.v[batch.version] && Object.keys(doc.v).length >= BETA_MAX_VERSIONS_PER_DAY) return 'full';
  const row = doc.v[batch.version] ||= { batches: 0, counts: {} };
  row.batches += 1;
  for (const [n, v] of Object.entries(batch.counts)) row.counts[n] = (row.counts[n] || 0) + v;
  await env.CC.put(k, JSON.stringify(doc), { expirationTtl: BETA_TTL });
  return 'ok';
}

/** Totals for the last `days` UTC days (staff read). */
export async function readBetaTotals(env, days = 30, now = Date.now()) {
  const n = Math.min(90, Math.max(1, Math.floor(Number(days)) || 30));
  const list = [];
  for (let i = 0; i < n; i++) list.push(isoDay(now - i * DAY_MS));
  const rows = await Promise.all(list.map(d => env.CC.get('bc:' + d).then(v => { try { return [d, v ? JSON.parse(v).v || {} : {}]; } catch { return [d, {}]; } })));
  const totals = {};
  for (const [, vs] of rows) for (const r of Object.values(vs)) for (const [e, c] of Object.entries(r.counts || {})) totals[e] = (totals[e] || 0) + c;
  return { days: rows.filter(([, v]) => Object.keys(v).length).map(([day, versions]) => ({ day, versions })), totals };
}

/** POST body -> Response. Never touches anything but Content-Type, Content-Length and the body. */
export async function postBetaCounts(req, env, { json }, now = Date.now()) {
  const bad = () => json({ error: 'bad request' }, 400);
  if (!/^application\/json(\s*;|$)/i.test(req.headers.get('Content-Type') || '')) return bad();
  const len = Number(req.headers.get('Content-Length') || 0);
  if (len > BETA_MAX_BODY) return bad();
  if (!req.body) return bad();
  // Read at most BETA_MAX_BODY + 1 bytes, so a missing/lying Content-Length can't make us buffer a big body.
  const reader = req.body.getReader(); const parts = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > BETA_MAX_BODY) { try { await reader.cancel(); } catch {} return bad(); }
    parts.push(value);
  }
  const buf = new Uint8Array(size); let o = 0; for (const p of parts) { buf.set(p, o); o += p.byteLength; }
  let b; try { b = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buf)); } catch { return bad(); }
  const batch = validateBetaBatch(b, now);
  if (!batch) return bad();
  if ((await addBetaBatch(env, batch)) !== 'ok') return json({ error: 'try again tomorrow' }, 429);
  return json({ ok: true });
}
