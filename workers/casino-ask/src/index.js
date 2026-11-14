// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
/**
 * tiltcheck-casino-ask: answers casino questions from the casino's own pages and TiltCheck's records.
 *
 * POST /ask                  { "question": "..." } from the tiltcheck.me Casinos page
 * POST /discord/interactions Discord /ask (signed by Discord)
 * GET  /health               { ok, ready } (never echoes a secret)
 *
 * Secrets (set at deploy, never in this repo): GROQ_API_KEY.
 * Vars: DISCORD_PUBLIC_KEY (public by design), GROQ_MODEL (optional).
 * Optional bindings: ASK_KV (KV, cache), ASK_LIMITER (rate-limit binding).
 */
import { answerQuestion, MAX_QUESTION, normalizeQuestion } from './answer.js';
import { handleInteraction, verifyDiscordRequest } from './discord.js';
import { allow, cached, makeStore } from './limits.js';
import { REPORTS_SUMMARY_URL } from './sources.js';
import { htmlToText } from './text.js';

export const ALLOWED_ORIGINS = new Set(['https://tiltcheck.me', 'https://www.tiltcheck.me', 'https://tiltcheck-me.github.io']);
const PAGE_TTL = 6 * 3600;
const ANSWER_TTL = 10 * 60;
const REPORTS_TTL = 10 * 60;
const MAX_PAGE_BYTES = 3_000_000;

function corsHeaders(origin) {
  if (!origin || !(ALLOWED_ORIGINS.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });
}

/** Network side of the pipeline, cached. Exported so tests can swap fetch. */
export function makeIo(env, store, fetchImpl = fetch) {
  return {
    async pageText(url) {
      const { value } = await cached(store, `page:${url}`, PAGE_TTL, async () => {
        const res = await fetchImpl(url, {
          headers: { 'user-agent': 'Mozilla/5.0 (compatible; TiltCheckAsk/0.1; +https://tiltcheck.me/casinos/)', accept: 'text/html' },
          redirect: 'follow',
        });
        if (!res.ok) throw new Error(`page ${res.status}`);
        const html = (await res.text()).slice(0, MAX_PAGE_BYTES);
        return htmlToText(html);
      });
      return value;
    },
    async reportsSummary() {
      const { value } = await cached(store, 'reports:summary', REPORTS_TTL, async () => {
        const res = await fetchImpl(REPORTS_SUMMARY_URL, { headers: { accept: 'application/json' } });
        if (!res.ok) throw new Error(`reports ${res.status}`);
        return res.json();
      });
      return value;
    },
  };
}

export async function answerCached(question, env, store, fetchImpl = fetch) {
  const q = normalizeQuestion(question);
  const key = `answer:v1:${q.toLowerCase()}`;
  const io = makeIo(env, store, fetchImpl);
  const hit = await store.get(key);
  if (hit) return { ...JSON.parse(hit), cached: true };
  const value = await answerQuestion(q, { env, io, fetchImpl });
  // Only settled answers are cached; a timeout or a missing key should not stick for 10 minutes.
  if (['answered', 'unknown', 'no_casino'].includes(value.status)) await store.put(key, JSON.stringify(value), ANSWER_TTL);
  return { ...value, cached: false };
}

export async function handle(request, env, ctx, fetchImpl = fetch) {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  const cors = corsHeaders(origin);
  const store = makeStore(env);

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  if (url.pathname === '/health' && request.method === 'GET') {
    return json({ ok: true, ready: Boolean(env.GROQ_API_KEY) }, 200, cors);
  }

  if (url.pathname === '/ask' && request.method === 'POST') {
    if (origin && !cors['access-control-allow-origin']) return json({ status: 'forbidden', answer: 'Origin not allowed.' }, 403);
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    if (!(await allow(env, `web:${ip}`))) {
      return json({ status: 'limited', answer: 'Slow down. Try again in a minute.' }, 429, { ...cors, 'retry-after': '60' });
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ status: 'invalid', answer: 'Send JSON: {"question": "..."}' }, 400, cors);
    }
    const question = String((body && body.question) || '');
    if (question.length > MAX_QUESTION) {
      return json({ status: 'invalid', answer: `Keep it under ${MAX_QUESTION} characters.` }, 400, cors);
    }
    const result = await answerCached(question, env, store, fetchImpl);
    return json(result, 200, cors);
  }

  if (url.pathname === '/discord/interactions' && request.method === 'POST') {
    const raw = await request.text();
    const ok = await verifyDiscordRequest(
      env.DISCORD_PUBLIC_KEY,
      request.headers.get('x-signature-ed25519'),
      request.headers.get('x-signature-timestamp'),
      raw,
    );
    if (!ok) return new Response('invalid request signature', { status: 401 });
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return new Response('bad json', { status: 400 });
    }
    const out = await handleInteraction(body, {
      env,
      fetchImpl,
      waitUntil: (p) => (ctx && ctx.waitUntil ? ctx.waitUntil(p) : p),
      answer: (q) => answerCached(q, env, store, fetchImpl),
      allow: (key) => allow(env, key),
    });
    return json(out);
  }

  return json({ status: 'not_found' }, 404, cors);
}

export default {
  fetch(request, env, ctx) {
    return handle(request, env, ctx);
  },
};
