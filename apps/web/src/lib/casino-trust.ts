/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
import {
  COMMUNITY_DEFAULT_CASINOS,
  getCommunityDefaultCasinoPriority,
  normalizeCasinoName,
} from '@tiltcheck/shared/community-casinos';
import RAW_CASINOS from '@/data/casinos.json';

export interface LiveTrustScore {
  casinoName: string;
  currentScore: number;
  riskLevel: string;
  events24h: number;
  updatedAt?: string;
}

interface RawCasino {
  name: string;
  grade: string;
  risk: string;
  category: string;
}

interface CasinoMeta {
  license?: string;
  violations?: string[];
}

export interface CasinoEntry extends RawCasino {
  slug: string;
  score: number;
  communityPriority: number;
  sourcePriority: number;
  meta: CasinoMeta;
  affiliateUrl?: string;
  promoCode?: string | null;
  monitoredDomain?: string | null;
  domainCandidates: string[];
  financialPayouts: number;
  fairnessTransparency: number;
  promotionalHonesty: number;
  operationalSupport: number;
  communityReputation: number;
}

export const GRADE_SCORE: Record<string, number> = {
  'A+': 95, 'A': 90, 'A-': 85,
  'B+': 82, 'B': 78, 'B-': 73,
  'C+': 68, 'C': 62, 'C-': 55,
  'D+': 48, 'D': 40, 'D-': 33,
  'F': 15,
};

const CATEGORY_FLAGS: Record<string, Record<string, number>> = {
  Regulated: { fin: 10, fair: 8, promo: 8, ops: 10, rep: 5 },
  Crypto: { fin: 0, fair: 10, promo: -5, ops: -5, rep: 0 },
  Offshore: { fin: -5, fair: -5, promo: -5, ops: -5, rep: 0 },
  'Sweeps Hybrid': { fin: 5, fair: -5, promo: -8, ops: 0, rep: -5 },
  Sweeps: { fin: 5, fair: -5, promo: -8, ops: 0, rep: -5 },
  'Grey Market': { fin: -10, fair: -10, promo: -10, ops: -8, rep: -8 },
  Scam: { fin: -30, fair: -30, promo: -30, ops: -30, rep: -30 },
};

const BONUS_FEED_PRIORITY: Record<string, number> = {
  'WOW Vegas': 1,
  'Modo Casino': 2,
};

const COLLECTCLOCK_LINKS: Record<string, { url: string; code: string | null }> = {
  TrustDice: { url: 'https://trustdice.win/faucet/?ref=u_jmenichole', code: null },
  'Stake.us': { url: 'https://stake.us/?c=Jmenichole', code: null },
  Shuffle: { url: 'https://shuffle.com?r=jHR7JnWRPF', code: null },
  'WOW Vegas': { url: 'https://www.wowvegas.com/?raf=3615494', code: null },
  Pulsz: { url: 'https://www.pulsz.com/?invited_by=utfk4r', code: 'PULSE10' },
  'Modo Casino': { url: 'https://modo.us?referralCode=61MN6A', code: null },
  McLuck: { url: 'https://www.mcluck.com/lp/raf?r=61119407%2F908900038', code: null },
  'Crown Coins Casino': { url: 'https://crowncoinscasino.com/?utm_campaign=59048bf4-dbeb-4c58-b690-d7ad11bdb847&utm_source=friends', code: null },
  'Zula Casino': { url: 'https://www.zulacasino.com/signup/221ddd92-862e-45d8-acc0-4cd2c26f7cdd', code: null },
  'Fortune Coins': { url: 'https://www.fortunecoins.com/signup/3c08936f-8979-4f87-b377-efdbff519029', code: null },
  'High 5 Casino': { url: 'https://high5casino.com/gc?adId=INV001%3AJmenichole', code: 'HIGH5DAILY' },
  'Chumba Casino': { url: 'https://chumbacasino.com', code: 'CHUMBAFREE5' },
  'Global Poker': { url: 'https://globalpoker.com', code: null },
  'LuckyLand Slots': { url: 'https://luckylandslots.com', code: null },
  Sportzino: { url: 'https://sportzino.com/signup/8a105ba6-7ada-45c8-b021-f478ac03c7c4', code: null },
  'Hello Millions': { url: 'https://www.hellomillions.com/lp/raf?r=26d6760f%2F1236643867', code: null },
  Funrize: { url: 'https://funrize.com', code: 'FUN100' },
  NoLimitCoins: { url: 'https://nolimitcoins.com/?invited_by=ZI1JIU', code: null },
  'Clubs Poker': { url: 'https://play.clubs.poker/?referralCode=104192', code: null },
  Jackpota: { url: 'https://www.jackpota.com/?r=85453282', code: null },
  PlayFame: { url: 'https://www.playfame.com/lp/raf?r=1275975417', code: null },
  'American Luck': { url: 'https://americanluck.com/signup/e360918f-8986-4dec-9823-a902d3f4936a', code: null },
  Punt: { url: 'https://punt.com/c/cg60pd', code: null },
  Chanced: { url: 'https://chanced.com/c/ysa096', code: null },
  FortuneWheelz: { url: 'https://fortunewheelz.com/?invited_by=P36ZS6', code: null },
  Spree: { url: 'https://spree.com/?r=1450539', code: null },
  Rolla: { url: 'https://www.rolla.com/?raf=3873', code: null },
  'Pulsz Bingo': { url: 'https://www.pulszbingo.com/?invited_by=eg6mbf', code: null },
  MegaBonanza: { url: 'https://www.megabonanza.com/?r=72781897', code: null },
  'Mega Bonanza': { url: 'https://www.megabonanza.com/?r=72781897', code: null },
  'Real Prize': { url: 'https://www.realprize.com/refer/317136', code: null },
  Zoot: { url: 'https://getzoot.us/?referralCode=ZOOTwithJMENICHOLE', code: null },
};

const CASINO_META: Record<string, CasinoMeta> = {
  'Chumba Casino': { license: 'VGW Holdings — Sweepstakes model (US/Canada)', violations: [] },
  'Global Poker': { license: 'VGW Holdings — Sweepstakes model (US/Canada)', violations: [] },
  'LuckyLand Slots': { license: 'VGW Holdings — Sweepstakes model (US/Canada)', violations: [] },
  Pulsz: { license: 'Sweepstakes model (US/Canada)', violations: [] },
  'WOW Vegas': { license: 'Sweepstakes model (US/Canada)', violations: [] },
  'High 5 Casino': { license: 'Sweepstakes model (US/Canada)', violations: [] },
  'Stake.us': { license: 'Sweepstakes model (US/Canada)', violations: ['Confusing sweepstakes redemption terms', 'Limited cashout options vs Stake.com'] },
  McLuck: { license: 'Sweepstakes model (US/Canada)', violations: [] },
  'Fortune Coins': { license: 'Sweepstakes model (US/Canada)', violations: [] },
  'Hello Millions': { license: 'Sweepstakes model (US/Canada)', violations: [] },
  'Modo Casino': { license: 'Sweepstakes model (US/Canada)', violations: [] },
  Funrize: { license: 'Sweepstakes model (US/Canada)', violations: [] },
  'Zula Casino': { license: 'Sweepstakes model (US/Canada)', violations: [] },
  'Crown Coins Casino': { license: 'Sweepstakes model (US/Canada)', violations: [] },
  NoLimitCoins: { license: 'Sweepstakes model (US/Canada)', violations: [] },
  Sportzino: { license: 'Sweepstakes model (US/Canada)', violations: [] },
  'DraftKings Casino': { license: 'NJ DGE / PA PGCB / MI MGCB / WV LCB', violations: [] },
  'FanDuel Casino': { license: 'NJ DGE / PA PGCB / MI MGCB', violations: [] },
  BetMGM: { license: 'NJ DGE / PA PGCB / MI MGCB / WV LCB', violations: [] },
  'Caesars Casino': { license: 'NJ DGE / PA PGCB / MI MGCB', violations: [] },
  BetRivers: { license: 'NJ DGE / PA PGCB / MI MGCB / IL IGB', violations: [] },
  'Borgata Online': { license: 'NJ DGE', violations: [] },
  'Golden Nugget Online': { license: 'NJ DGE / PA PGCB', violations: [] },
  'Hard Rock Bet': { license: 'NJ DGE / PA PGCB', violations: [] },
  WynnBET: { license: 'NJ DGE / MI MGCB', violations: [] },
  PlaySugarHouse: { license: 'NJ DGE / PA PGCB', violations: [] },
  Bet365: { license: 'UKGC / Malta MGA / Gibraltar GGB', violations: ['£52.5m UKGC fine (2023) — AML and social responsibility failures'] },
  '888casino': { license: 'UKGC / Gibraltar GGB / Malta MGA', violations: ['£9.4m UKGC fine (2022) — social responsibility failures'] },
  'PokerStars Casino': { license: 'Isle of Man GSC / UKGC / Malta MGA', violations: [] },
  'Stake.com': { license: 'Curaçao eGaming', violations: ['Blocked in US, UK, Australia, and numerous other jurisdictions', 'No independent third-party RTP audits published', 'Influencer marketing targeting under-25 audiences'] },
  Roobet: { license: 'Curaçao eGaming', violations: ['Blocked in multiple EU and North American jurisdictions', 'Operates in restricted regions relying on VPN workarounds'] },
  Rollbit: { license: 'Curaçao eGaming', violations: ['No published independent RTP audits', 'NFT/token integration raises unresolved regulatory questions'] },
  'BC.Game': { license: 'Curaçao eGaming / Kahnawake', violations: ['Community withdrawal delay reports', 'Limited responsible gambling toolset'] },
  Bovada: { license: 'Kahnawake Gaming Commission', violations: ['Unlicensed in most US states', 'Withdrawal processing delay reports in community forums'] },
  'Ignition Casino': { license: 'Kahnawake Gaming Commission', violations: ['Unlicensed in most US states'] },
  SlotsOfVegas: { license: 'No valid gaming license detected', violations: ['Widespread withdrawal denial reports', 'Blacklisted by AskGamblers and Casinomeister', 'Fake bonus terms'] },
  'CoolCat Casino': { license: 'No valid gaming license detected', violations: ['Blacklisted by multiple watchdog sites', 'Chronic non-payment reports'] },
  'Raging Bull Casino': { license: 'No valid gaming license detected', violations: ['Blacklisted by Casinomeister', 'Chronic non-payment reports', 'Fake no-deposit bonus claims'] },
  'Grand Eagle': { license: 'No valid gaming license', violations: ['Clone site associated with rogue operator network'] },
  'Cherry Gold': { license: 'No valid gaming license', violations: ['Part of rogue casino network — non-payment reports widespread'] },
  'Slot Madness': { license: 'No valid gaming license', violations: ['Blacklisted — withdrawal refusal and false advertising reported'] },
  'SpinPalace (clone network)': { license: 'No valid gaming license', violations: ['Clone network — not affiliated with original SpinPalace', 'Blacklisted across watchdog networks'] },
  'Royal Ace Casino': { license: 'No valid gaming license', violations: ['Blacklisted — chronic non-payment and predatory bonus terms'] },
  'TwoUp Casino': { license: 'No valid gaming license', violations: ['Blacklisted — withdrawal denial and KYC abuse reported'] },
  'Planet 7 Casino': { license: 'No valid gaming license', violations: ['Blacklisted — false advertising of no-deposit bonuses'] },
  'Prism Casino': { license: 'No valid gaming license', violations: ['Blacklisted — rogue operator, chronic non-payment'] },
  'Eclipse Casino': { license: 'No valid gaming license', violations: ['Blacklisted — associated with rogue operator network'] },
};

function clamp(value: number): number {
  return Math.max(5, Math.min(100, value));
}

function hashStr(value: string): number {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) + value.charCodeAt(index);
    hash &= hash;
  }
  return Math.abs(hash);
}

function seededFloat(seed: number, salt: number): number {
  const value = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function derivePillars(base: number, category: string, seed: number) {
  const modifier = CATEGORY_FLAGS[category] ?? { fin: 0, fair: 0, promo: 0, ops: 0, rep: 0 };
  return {
    financialPayouts: clamp(base + modifier.fin + Math.round((seededFloat(seed, 1) - 0.5) * 6)),
    fairnessTransparency: clamp(base + modifier.fair + Math.round((seededFloat(seed, 2) - 0.5) * 6)),
    promotionalHonesty: clamp(base + modifier.promo + Math.round((seededFloat(seed, 3) - 0.5) * 6)),
    operationalSupport: clamp(base + modifier.ops + Math.round((seededFloat(seed, 4) - 0.5) * 6)),
    communityReputation: clamp(base + modifier.rep + Math.round((seededFloat(seed, 5) - 0.5) * 6)),
  };
}

function extractHostname(url?: string): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

function uniqueDomains(domains: Array<string | null | undefined>): string[] {
  return [...new Set(domains.filter((domain): domain is string => Boolean(domain)).map((domain) => domain.toLowerCase()))];
}

const COMMUNITY_DOMAIN_BY_NAME = (() => {
  const domains = new Map<string, string>();

  for (const casino of COMMUNITY_DEFAULT_CASINOS) {
    if (!casino.monitoredDomain) {
      continue;
    }

    domains.set(normalizeCasinoName(casino.name), casino.monitoredDomain);

    for (const alias of casino.aliases ?? []) {
      domains.set(normalizeCasinoName(alias), casino.monitoredDomain);
    }
  }

  return domains;
})();

export function slugifyCasinoName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeTrustKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

const sortedGradeEntries = Object.entries(GRADE_SCORE).sort((left, right) => left[1] - right[1]);

export function gradeFromNumericScore(score: number): string {
  return sortedGradeEntries.reduce((best, [grade, threshold]) => (
    Math.abs(threshold - score) < Math.abs(GRADE_SCORE[best] - score) ? grade : best
  ), 'F');
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#17c3b2';
  if (score >= 60) return '#ffd700';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

export function getRiskBadgeStyle(risk: string): { color: string; border: string } {
  if (risk === 'Low') return { color: '#17c3b2', border: 'rgba(23,195,178,0.3)' };
  if (risk === 'Medium') return { color: '#ffd700', border: 'rgba(255,215,0,0.3)' };
  if (risk === 'Medium-High') return { color: '#f97316', border: 'rgba(249,115,22,0.3)' };
  if (risk === 'High') return { color: '#ef4444', border: 'rgba(239,68,68,0.3)' };
  return { color: '#ef4444', border: 'rgba(239,68,68,0.3)' };
}

export function formatRiskLabel(risk: string): string {
  const normalized = risk.replace(/[_\s]+/g, '-').trim();
  if (!normalized) {
    return 'Unknown';
  }

  return normalized
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join('-');
}

export const SCAM_FLAGS = [
  'Withdrawal requests delayed or denied without explanation',
  'Terms updated silently post-deposit',
  'User accounts locked after winning sessions',
  'Community reports of unpaid bonuses',
  'KYC requests used to stall payouts',
];

export interface PublicTrustSupportModule {
  key: 'domain' | 'scams' | 'bonuses' | 'rtp';
  eyebrow: string;
  title: string;
  href: string;
  description: string;
  ctaLabel: string;
}

export const PUBLIC_TRUST_SUPPORT_MODULES: PublicTrustSupportModule[] = [
  {
    key: 'domain',
    eyebrow: 'Registry + domain',
    title: 'Verify the monitored domain',
    href: '/tools/domain-verifier',
    description: 'Run a direct domain scan and license check when you need to inspect a hostname outside the canonical proof page.',
    ctaLabel: 'Open domain verifier',
  },
  {
    key: 'scams',
    eyebrow: 'Blacklist check',
    title: 'Read the scam blacklist',
    href: '/intel/scams',
    description: 'Review the repository-backed blacklist feed directly. If the source is empty or down, that page says it.',
    ctaLabel: 'Open scam intel',
  },
  {
    key: 'bonuses',
    eyebrow: 'Inbox + bonus feed',
    title: 'Inspect bonus evidence',
    href: '/bonuses',
    description: 'Check inbox-discovered and CollectClock bonus coverage when the proof page shows a bonus gap or stale evidence.',
    ctaLabel: 'Open bonus intel',
  },
  {
    key: 'rtp',
    eyebrow: 'RTP drift',
    title: 'Review RTP reference data',
    href: '/intel/rtp',
    description: 'Use the certified RTP database to understand deployment risk before escalating into live session telemetry.',
    ctaLabel: 'Open RTP intel',
  },
];

export const CASINOS: CasinoEntry[] = (RAW_CASINOS as RawCasino[]).map((casino) => {
  const base = GRADE_SCORE[casino.grade] ?? 40;
  const seed = hashStr(casino.name);
  const collectClockLink = COLLECTCLOCK_LINKS[casino.name];
  const monitoredDomain = COMMUNITY_DOMAIN_BY_NAME.get(normalizeCasinoName(casino.name)) ?? extractHostname(collectClockLink?.url);

  return {
    ...casino,
    slug: slugifyCasinoName(casino.name),
    score: base,
    communityPriority: getCommunityDefaultCasinoPriority(casino.name),
    sourcePriority: BONUS_FEED_PRIORITY[casino.name] ?? Number.MAX_SAFE_INTEGER,
    meta: CASINO_META[casino.name] ?? {},
    affiliateUrl: collectClockLink?.url,
    promoCode: collectClockLink?.code ?? null,
    monitoredDomain,
    domainCandidates: uniqueDomains([monitoredDomain, extractHostname(collectClockLink?.url)]),
    ...derivePillars(base, casino.category, seed),
  };
}).sort(
  (left, right) =>
    left.communityPriority - right.communityPriority ||
    left.sourcePriority - right.sourcePriority ||
    right.score - left.score,
);

export const ALL_CATEGORIES = ['All', ...Array.from(new Set(CASINOS.map((casino) => casino.category))).sort()];

export const COLLECTCLOCK_NO_CODE = CASINOS
  .filter((casino) => casino.affiliateUrl && !casino.promoCode)
  .map((casino) => casino.name);

const CASINO_BY_SLUG = new Map(CASINOS.map((casino) => [casino.slug, casino]));

export function getCasinoBySlug(slug: string): CasinoEntry | null {
  return CASINO_BY_SLUG.get(slug) ?? null;
}

export function casinoMatchesQuery(casino: CasinoEntry, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return (
    casino.name.toLowerCase().includes(normalizedQuery) ||
    casino.category.toLowerCase().includes(normalizedQuery) ||
    casino.grade.toLowerCase().includes(normalizedQuery) ||
    casino.risk.toLowerCase().includes(normalizedQuery) ||
    casino.domainCandidates.some((domain) => domain.includes(normalizedQuery))
  );
}

export function findLiveTrustScore(
  casino: Pick<CasinoEntry, 'name' | 'slug' | 'domainCandidates'>,
  scores: LiveTrustScore[],
): LiveTrustScore | null {
  const keys = new Set([
    normalizeTrustKey(casino.name),
    normalizeTrustKey(casino.slug),
    ...casino.domainCandidates.map((domain) => normalizeTrustKey(domain)),
  ]);

  return scores.find((entry) => keys.has(normalizeTrustKey(entry.casinoName))) ?? null;
}
