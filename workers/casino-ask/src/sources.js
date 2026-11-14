// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
/**
 * Where answers are allowed to come from:
 *  1. The casino's own published pages (terms, rules, help), listed in OFFICIAL_PAGES.
 *  2. TiltCheck's casino audit data (apps/web/src/data/casinos.json, shown on tiltcheck.me/casinos/).
 *  3. CollectClock player reports (/casino-reports/summary on the collectclock-api worker).
 *
 * Adding a casino's pages: use pages on the casino's own domain that a plain fetch can read
 * (no sign-in, not an empty app shell). Check with:
 *   curl -sL -A "Mozilla/5.0" <url> | node workers/casino-ask/scripts/page-text.mjs
 * Pages that come back empty or blocked only make the lookup say "I don't know".
 */
import auditData from '../../../apps/web/src/data/casinos.json' with { type: 'json' };

export const SITE_CASINOS_URL = 'https://tiltcheck.me/casinos/';
export const REPORTS_SUMMARY_URL = 'https://collectclock-api.j-chapman7.workers.dev/casino-reports/summary';

/** Same slug rule as the collectclock-api worker, so report keys line up. */
export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/** Casino-owned pages, checked readable with a plain fetch on 2026-11-13. */
export const OFFICIAL_PAGES = [
  {
    name: 'Acebet',
    aliases: ['acebet', 'ace bet', 'acebet.cc', 'acebet cc', 'acebet us'],
    pages: [
      { title: 'Acebet.cc Redemptions', url: 'https://acebet.cc/redemptions' },
      { title: 'Acebet.cc Promotional Play Rules', url: 'https://acebet.cc/policies/promotional-play-policy' },
      { title: 'Acebet.cc Terms of Service', url: 'https://acebet.cc/policies/terms-of-service' },
      { title: 'Acebet.cc Service Availability', url: 'https://acebet.cc/faq/service-availability' },
    ],
  },
];

function defaultAliases(name) {
  const n = name.toLowerCase();
  const out = new Set([n, n.replace(/\./g, ' '), n.replace(/[^a-z0-9]+/g, '')]);
  const bare = n.replace(/\s+(casino|slots)$/, '');
  if (bare !== n && bare.length >= 4) out.add(bare);
  if (/^stake\.(us|com)$/.test(n)) out.add('stake');
  return [...out].filter((a) => a.length >= 3);
}

/** TiltCheck's own audit record as plain text, only fields that are present. */
export function auditText(c) {
  const lines = [`TiltCheck audit of ${c.name}.`];
  if (c.grade) lines.push(`TiltCheck grade: ${c.grade}. Risk: ${c.risk || 'not rated'}. Category: ${c.category || 'not set'}.`);
  if (c.license) lines.push(`License and entity: ${c.license}.`);
  if (c.playthrough) lines.push(`Playthrough: ${c.playthrough}.`);
  if (Number.isFinite(c.redemptionMinHours) && Number.isFinite(c.redemptionMaxHours)) {
    lines.push(`Redemption (cashout) time on record: ${c.redemptionMinHours} to ${c.redemptionMaxHours} hours.`);
  }
  if (c.rtpSummary) lines.push(`RTP: ${c.rtpSummary}.`);
  for (const e of c.evidence || []) lines.push(e);
  return lines.join(' ');
}

/** One entry per casino: { slug, name, aliases, pages, audit } */
export function buildCatalog(audits = auditData, official = OFFICIAL_PAGES) {
  const bySlug = new Map();
  for (const c of audits) {
    if (!c || !c.audited || !c.name) continue;
    const slug = slugify(c.name);
    bySlug.set(slug, { slug, name: c.name, aliases: defaultAliases(c.name), pages: [], audit: c });
  }
  for (const o of official) {
    const slug = slugify(o.name);
    const cur = bySlug.get(slug) || { slug, name: o.name, aliases: [], pages: [], audit: null };
    cur.aliases = [...new Set([...cur.aliases, ...defaultAliases(o.name), ...(o.aliases || [])])];
    cur.pages = [...cur.pages, ...o.pages];
    bySlug.set(slug, cur);
  }
  return [...bySlug.values()];
}

export const CATALOG = buildCatalog();

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Casinos named in the question (word-boundary match on any alias). Longest alias wins ties. */
export function findCasinos(question, catalog = CATALOG) {
  const q = ` ${String(question || '').toLowerCase().replace(/[\u2019']s\b/g, '')} `;
  const hits = [];
  for (const c of catalog) {
    let best = '';
    for (const a of c.aliases) {
      const re = new RegExp(`(^|[^a-z0-9])${escapeRe(a)}($|[^a-z0-9])`);
      if (re.test(q) && a.length > best.length) best = a;
    }
    if (best) hits.push({ casino: c, alias: best });
  }
  hits.sort((x, y) => y.alias.length - x.alias.length);
  // "stake.us" in the question should not also pull "stake.com" through the bare "stake" alias.
  const strong = hits.filter((h) => h.alias.includes('.') || h.alias.includes(' '));
  const keep = hits.filter((h) => !(h.alias === 'stake' && strong.some((s) => s.casino.slug !== h.casino.slug && s.alias.startsWith('stake'))));
  return keep.map((h) => h.casino).slice(0, 2);
}
