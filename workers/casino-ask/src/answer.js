// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
/**
 * The answer pipeline: find the casino, gather its sources, pick excerpts, ask Groq,
 * then check the reply against the excerpts before anyone sees it.
 *
 * Rules the checks enforce (not just the prompt):
 *  - every answer cites at least one excerpt it was given;
 *  - every number in the reply appears in the excerpts it cites;
 *  - if the question names something none of the sources mention, the answer is "I don't know".
 */
import { CATALOG, findCasinos } from './sources.js';
import { gatherDocs, selectExcerpts } from './retrieve.js';
import { numberSet, numbersIn } from './text.js';

export const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
export const MAX_QUESTION = 300;

export const SYSTEM_PROMPT = [
  'You answer questions about online casinos for TiltCheck.',
  'Use only the numbered excerpts in the user message. They come from the casino\'s own published pages and TiltCheck\'s own records.',
  'Never use outside knowledge. Never guess, estimate, round, or convert a number, time, fee, or limit.',
  'Every number you write must appear in an excerpt you cite.',
  'If the excerpts do not answer the exact question, set known to false. That includes a question about a product, card, method, or rule the excerpts never name.',
  'Say who says it, for example: Acebet\'s Promotional Play Rules say redemptions can take up to 30 days.',
  'Plain, dry sentences. At most 3 sentences. No exclamation marks. No advice.',
  'Return JSON only, in this shape:',
  '{"known": true or false, "answer": "...", "sources": ["S1"], "nearest": "...", "nearest_sources": ["S2"]}',
  'When known is false, answer is "" and sources is []. nearest is one sentence with the closest related fact the excerpts do state, with its sources, or "" when there is none.',
].join('\n');

export function normalizeQuestion(q) {
  return String(q || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_QUESTION);
}

export function buildUserPrompt(question, casinos, excerpts) {
  const lines = [`Question: ${question}`, `Casino: ${casinos.map((c) => c.name).join(', ')}`, '', 'Excerpts:'];
  for (const e of excerpts) lines.push(`[${e.id}] ${e.title} (${e.url})\n${e.text}`);
  return lines.join('\n\n');
}

export async function callGroq({ apiKey, model, question, casinos, excerpts, fetchImpl = fetch, timeoutMs = 15000 }) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(GROQ_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        temperature: 0,
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(question, casinos, excerpts) },
        ],
      }),
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(`groq ${res.status}`);
    const data = await res.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return JSON.parse(content || '{}');
  } finally {
    clearTimeout(timer);
  }
}

function cleanSentence(s, max = 600) {
  return String(s || '')
    .replace(/!/g, '.')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Keeps a model claim only when it cites real excerpts and every number in it is in those excerpts. */
export function checkClaim(text, ids, excerpts) {
  const byId = new Map(excerpts.map((e) => [e.id, e]));
  const cited = [...new Set(Array.isArray(ids) ? ids : [])].map((id) => byId.get(String(id).trim())).filter(Boolean);
  const claim = cleanSentence(text);
  if (!claim || !cited.length) return null;
  const allowed = numberSet(cited.map((e) => e.text).join(' '));
  for (const n of numbersIn(claim)) {
    if (!allowed.has(n) && !allowed.has(n.replace(/%$/, ''))) return null;
  }
  return { text: claim, excerpts: cited };
}

function linksFor(excerpts) {
  const seen = new Set();
  const out = [];
  for (const e of excerpts) {
    if (seen.has(e.url)) continue;
    seen.add(e.url);
    out.push({ title: e.title, url: e.url });
  }
  return out;
}

function casinoNames(casinos) {
  return casinos.map((c) => c.name).join(' and ');
}

function dontKnow({ casinos, missing, nearest, checked, reason }) {
  const name = casinoNames(casinos);
  let answer;
  if (missing && missing.length) {
    const words = missing.map((w) => `"${w}"`).join(', ');
    answer = `I don't know. ${name}'s pages and TiltCheck's records don't mention ${words}.`;
  } else if (reason === 'no_sources') {
    answer = `I don't know. None of ${name}'s pages could be read just now, and TiltCheck has nothing on this.`;
  } else {
    answer = `I don't know. ${name}'s pages and TiltCheck's records don't cover that.`;
  }
  return {
    status: 'unknown',
    casino: name,
    answer,
    nearest: nearest ? nearest.text : '',
    sources: nearest ? linksFor(nearest.excerpts) : [],
    checked,
  };
}

/**
 * @param {string} rawQuestion
 * @param {{ env: object, io: { pageText:Function, reportsSummary:Function }, fetchImpl?: Function, catalog?: Array }} deps
 */
export async function answerQuestion(rawQuestion, deps) {
  const { env = {}, io, fetchImpl = fetch, catalog = CATALOG } = deps;
  const question = normalizeQuestion(rawQuestion);
  if (question.length < 3) {
    return { status: 'invalid', answer: 'Ask a question about a casino, like: How long does Acebet take to redeem?', sources: [], checked: [] };
  }
  const casinos = findCasinos(question, catalog);
  if (!casinos.length) {
    return {
      status: 'no_casino',
      answer: `I don't know which casino you mean, or it isn't covered yet. Covered now: ${coveredList(catalog)}.`,
      sources: [],
      checked: [],
    };
  }

  const { docs, failed } = await gatherDocs(casinos, io);
  const checked = [...docs.map((d) => ({ title: d.title, url: d.url })), ...failed];
  const dedupChecked = linksFor(checked);
  if (!docs.length) return dontKnow({ casinos, checked: dedupChecked, reason: 'no_sources' });

  const { missing, excerpts } = selectExcerpts(question, casinos, docs);
  if (!excerpts.length) return dontKnow({ casinos, missing, checked: dedupChecked });

  if (!env.GROQ_API_KEY) {
    if (missing.length) return dontKnow({ casinos, missing, checked: dedupChecked });
    return { status: 'offline', casino: casinoNames(casinos), answer: 'Ask is not switched on yet. The sources below are where the answer would come from.', sources: [], checked: dedupChecked };
  }

  let out;
  try {
    out = await callGroq({ apiKey: env.GROQ_API_KEY, model: env.GROQ_MODEL, question, casinos, excerpts, fetchImpl });
  } catch {
    return { status: 'error', casino: casinoNames(casinos), answer: 'The answer service did not respond. Try again in a minute.', sources: [], checked: dedupChecked };
  }

  const answer = out && out.known === true ? checkClaim(out.answer, out.sources, excerpts) : null;
  const nearest = out ? checkClaim(out.nearest, out.nearest_sources, excerpts) : null;

  if (answer && !missing.length) {
    return { status: 'answered', casino: casinoNames(casinos), answer: answer.text, nearest: '', sources: linksFor(answer.excerpts), checked: dedupChecked };
  }
  return dontKnow({ casinos, missing, nearest, checked: dedupChecked });
}

export function coveredList(catalog = CATALOG) {
  const official = catalog.filter((c) => c.pages.length).map((c) => c.name);
  const audited = catalog.filter((c) => !c.pages.length && c.audit).length;
  return `${official.join(', ')} (its own pages), plus the ${audited} casinos TiltCheck has audited`;
}
