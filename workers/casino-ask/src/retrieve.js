// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
/**
 * Gathers the source documents for the casinos named in a question and picks the
 * excerpts the model is allowed to read.
 */
import { REPORTS_SUMMARY_URL, SITE_CASINOS_URL, auditText, slugify } from './sources.js';
import { chunkText, expandQuery, scoreChunk, stem, termIn, tokenize } from './text.js';

/**
 * @param {Array} casinos entries from findCasinos()
 * @param {{ pageText: (url:string)=>Promise<string>, reportsSummary: ()=>Promise<any> }} io
 * @returns {Promise<Array<{title:string,url:string,kind:string,casino:string,text:string}>>} readable docs plus `failed` pages
 */
export async function gatherDocs(casinos, io) {
  const docs = [];
  const failed = [];
  const jobs = [];
  for (const c of casinos) {
    for (const p of c.pages) {
      jobs.push(
        io
          .pageText(p.url)
          .then((text) => {
            if (text && text.length > 200) docs.push({ title: p.title, url: p.url, kind: 'official', casino: c.name, text });
            else failed.push({ title: p.title, url: p.url });
          })
          .catch(() => failed.push({ title: p.title, url: p.url })),
      );
    }
    if (c.audit) {
      docs.push({ title: `TiltCheck audit: ${c.name}`, url: SITE_CASINOS_URL, kind: 'tiltcheck', casino: c.name, text: auditText(c.audit) });
    }
  }
  let summary = null;
  jobs.push(
    io
      .reportsSummary()
      .then((s) => {
        summary = s;
      })
      .catch(() => {
        summary = null;
      }),
  );
  await Promise.all(jobs);
  if (summary && summary.casinos) {
    for (const c of casinos) {
      const keys = new Set([c.slug, ...c.aliases.map(slugify)]);
      const rows = [...keys].flatMap((k) => summary.casinos[k] || []);
      if (!rows.length) continue;
      const parts = rows.map(
        (r) => `${r.label}: ${r.reporters} player reports in the last 30 days${r.verified ? ' (verified)' : ''}${r.staff ? ' (staff confirmed)' : ''}.`,
      );
      docs.push({
        title: `CollectClock player reports: ${c.name}`,
        url: REPORTS_SUMMARY_URL,
        kind: 'reports',
        casino: c.name,
        text: `CollectClock player reports for ${c.name} (shown once ${summary.minReporters || 3} or more players report the same thing). ${parts.join(' ')}`,
      });
    }
  }
  // Stable order: official pages in registry order, then TiltCheck data.
  const order = new Map();
  casinos.forEach((c, ci) => c.pages.forEach((p, pi) => order.set(p.url, ci * 100 + pi)));
  docs.sort((a, b) => (order.get(a.url) ?? 1e6 + (a.kind === 'reports' ? 1 : 0)) - (order.get(b.url) ?? 1e6 + (b.kind === 'reports' ? 1 : 0)));
  return { docs, failed };
}

/**
 * Picks the excerpts most related to the question.
 * `missing` lists question words that appear in none of the documents: if the casino's
 * own pages never mention the thing asked about, the honest answer is "I don't know".
 */
export function selectExcerpts(question, casinos, docs, { maxExcerpts = 6, maxChars = 5200 } = {}) {
  const dropTerms = casinos.flatMap((c) => [c.name, ...c.aliases]);
  const terms = expandQuery(question, dropTerms);
  const chunks = [];
  for (let d = 0; d < docs.length; d++) {
    for (const text of chunkText(docs[d].text)) chunks.push({ doc: d, text, tokens: tokenize(text) });
  }
  const docFreq = new Map();
  for (const t of terms) {
    let n = 0;
    for (const ch of chunks) if (termIn(t, new Set(ch.tokens.map(stem)))) n++;
    docFreq.set(t.term, n);
  }
  const allTokens = new Set(docs.flatMap((d) => tokenize(d.text).map(stem)));
  const missing = terms.filter((t) => !t.soft && !termIn(t, allTokens)).map((t) => t.term);

  const scored = chunks
    .map((ch, i) => ({ ...ch, i, score: scoreChunk(ch.tokens, terms, docFreq, chunks.length) }))
    .filter((ch) => ch.score > 0)
    .sort((a, b) => b.score - a.score || a.i - b.i);

  const excerpts = [];
  let used = 0;
  const perDoc = new Map();
  for (const ch of scored) {
    if (excerpts.length >= maxExcerpts) break;
    if (used + ch.text.length > maxChars) continue;
    const n = perDoc.get(ch.doc) || 0;
    if (n >= 3) continue;
    perDoc.set(ch.doc, n + 1);
    used += ch.text.length;
    excerpts.push({ doc: ch.doc, text: ch.text, score: ch.score });
  }
  excerpts.forEach((e, k) => {
    e.id = `S${k + 1}`;
    e.title = docs[e.doc].title;
    e.url = docs[e.doc].url;
  });
  return { terms: terms.filter((t) => !t.soft).map((t) => t.term), missing, excerpts };
}
