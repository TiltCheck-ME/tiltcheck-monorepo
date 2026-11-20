// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-18
/**
 * Third-party payout-speed benchmarks (RotoWire), ported from PR #751.
 * Data: data/trust-engine/operator-facts.live.json, `payoutBenchmark` on each operator.
 * These are RotoWire's figures, kept apart from a casino's own terms and from TiltCheck's audits.
 * Plain string checks only (no regex on user input), so question length cannot cause backtracking.
 */
import factsData from '../../../data/trust-engine/operator-facts.live.json' with { type: 'json' };

export const PAYOUT_TABLE_URL = 'https://tiltcheck.me/casinos/#payout-speed';

export const PAYOUT_METHOD_TEXT =
  'Benchmark times run from casino approval until funds land, for a verified account. A first withdrawal can take 24-48 hours while KYC is checked.';

export const PAYOUT_SCOPE_TEXT =
  'Covers regulated real-money casinos in the 7 states RotoWire tracks (CT, DE, MI, NJ, PA, RI, WV). Florida is not one of them. Availability varies by state.';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-17" -> "Nov 17 2026"; anything else is returned unchanged. */
export function formatAsOf(asOf) {
  const parts = String(asOf || '').split('-');
  if (parts.length !== 3) return String(asOf || '');
  const [y, m, d] = parts.map(Number);
  const label = MONTHS[(m || 0) - 1];
  return y && label && d ? `${label} ${d} ${y}` : String(asOf);
}

/** One entry per operator with a benchmark: { slug, name, aliases, benchmark }. */
export function loadBenchmarks(data = factsData) {
  return (data.operators || [])
    .filter((o) => o && o.name && o.payoutBenchmark && o.payoutBenchmark.fastestSpeed)
    .map((o) => ({ slug: o.slug, name: o.name, aliases: Array.isArray(o.aliases) ? o.aliases : [], benchmark: o.payoutBenchmark }));
}

export const BENCHMARKS = loadBenchmarks();

export function speedWithMethods(b) {
  const methods = (b.topMethods || []).filter(Boolean);
  return methods.length ? `${b.fastestSpeed} via ${methods.join(', ')}` : b.fastestSpeed;
}

/** Plain-text source document for the answer pipeline, every figure as RotoWire gives it. */
export function benchmarkText(name, b) {
  return [
    `Third-party payout speed benchmark from ${b.source} for ${name}, as of ${formatAsOf(b.asOf)} (${b.asOf}).`,
    `${b.source} lists the payout (withdrawal, cash out, cashout) speed as ${speedWithMethods(b)}.`,
    b.note || '',
    // The KYC 24-48 hour line stays out of per-casino excerpts: the model mixed it into answers
    // citing other sources, and the number check then turned them into I don't know.
    'Benchmark times run from casino approval until funds land, for a verified account.',
    `This is ${b.source}'s figure, not the casino's own terms and not a TiltCheck test.`,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Coarse speed tier, lower is quicker (same rule as #751's payoutSpeedTier).
 * 0 instant · 1 minutes · 2 up to 1 hour · 3 a few hours · 4 within 24 hours · 5 business days · 6 unknown
 */
export function payoutSpeedTier(speed) {
  const v = String(speed || '').trim().toLowerCase();
  if (v.startsWith('instant')) return 0;
  if (v.includes('minute')) return 1;
  if (v.startsWith('up to 1 hour') || v.startsWith('under 1 hour') || v.startsWith('within 1 hour')) return 2;
  if (v.includes('business day')) return 5;
  if (v.includes('24')) return 4;
  if (v.includes('hour')) return 3;
  return 6;
}

/** Benchmarks ordered by tier, then name. */
export function rankBenchmarks(list = BENCHMARKS) {
  return list
    .map((e) => ({ ...e, tier: payoutSpeedTier(e.benchmark.fastestSpeed) }))
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
}

const PAYOUT_TERMS = ['payout', 'pay out', 'pays out', 'paying out', 'paid out', 'cash out', 'cashout', 'cash-out', 'cashes out', 'withdraw', 'redeem', 'redemption'];
const SPEED_RANKING_TERMS = ['fastest', 'quickest', 'instant', 'same day', 'same-day', 'fast payout', 'quick payout', 'fast cash', 'quick cash', 'fast withdraw', 'pays out fast', 'pay out fast', 'pays fastest'];

/** "Which casino pays out fastest?" with no casino named. Sweeps questions stay on their own path. */
export function isPayoutRankingQuestion(question) {
  const lower = String(question || '').toLowerCase();
  if (!PAYOUT_TERMS.some((t) => lower.includes(t))) return false;
  if (!SPEED_RANKING_TERMS.some((t) => lower.includes(t))) return false;
  return !lower.includes('sweep');
}

/** The answer to a ranking question: the casinos in RotoWire's quickest listed tier, with the source. */
export function payoutRankingAnswer(list = BENCHMARKS) {
  const ranked = rankBenchmarks(list);
  if (!ranked.length) return null;
  const topTier = ranked[0].tier;
  const top = ranked.filter((e) => e.tier === topTier);
  const asOf = ranked.reduce((latest, e) => (e.benchmark.asOf > latest ? e.benchmark.asOf : latest), ranked[0].benchmark.asOf);
  const src = ranked[0].benchmark;
  const names = top.map((e) => `${e.name} (${(e.benchmark.topMethods || []).join(', ') || e.benchmark.fastestSpeed})`).join('; ');
  const answer =
    `${src.source} (as of ${formatAsOf(asOf)}) lists ${top[0].benchmark.fastestSpeed.toLowerCase() === 'instant' ? 'Instant payouts' : `payouts of ${top[0].benchmark.fastestSpeed}`} at ${names}. ` +
    `${PAYOUT_METHOD_TEXT} ${PAYOUT_SCOPE_TEXT} These are ${src.source}'s figures, not TiltCheck tests. ` +
    `All ${ranked.length} casinos: tiltcheck.me/casinos/#payout-speed`;
  return {
    status: 'answered',
    casino: '',
    answer,
    nearest: '',
    sources: [
      { title: `${src.source}: Instant withdrawal casinos`, url: src.sourceUrl },
      { title: 'TiltCheck payout-speed table', url: PAYOUT_TABLE_URL },
    ],
    checked: [],
  };
}
