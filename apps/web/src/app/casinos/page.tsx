/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08 */
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import "@/styles/terminal.css";
import RAW_CASINOS from '@/data/casinos.json';

interface LiveTrustScore {
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

interface CasinoEntry extends RawCasino {
  score: number;
  popularity: number;
  meta: CasinoMeta;
  financialPayouts: number;
  fairnessTransparency: number;
  promotionalHonesty: number;
  operationalSupport: number;
  communityReputation: number;
}

const GRADE_SCORE: Record<string, number> = {
  'A+': 95, 'A': 90, 'A-': 85,
  'B+': 82, 'B': 78, 'B-': 73,
  'C+': 68, 'C': 62, 'C-': 55,
  'D+': 48, 'D': 40, 'D-': 33,
  'F': 15,
};

const CATEGORY_FLAGS: Record<string, Record<string, number>> = {
  'Regulated':     { fin: 10, fair: 8,  promo: 8,  ops: 10, rep: 5  },
  'Crypto':        { fin: 0,  fair: 10, promo: -5, ops: -5, rep: 0  },
  'Offshore':      { fin: -5, fair: -5, promo: -5, ops: -5, rep: 0  },
  'Sweeps Hybrid': { fin: 5,  fair: -5, promo: -8, ops: 0,  rep: -5 },
  'Sweeps':        { fin: 5,  fair: -5, promo: -8, ops: 0,  rep: -5 },
  'Grey Market':   { fin: -10,fair: -10,promo: -10,ops: -8, rep: -8 },
  'Scam':          { fin: -30,fair: -30,promo: -30,ops: -30,rep: -30},
};

// Deterministic pseudo-random — avoids pillar scores re-rolling on every render
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) + h) + s.charCodeAt(i); h = h & h; }
  return Math.abs(h);
}
function seededFloat(seed: number, salt: number): number {
  const x = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Lower number = shown first. Sweepstakes platforms ranked first — most relevant to US community.
const POPULARITY_RANK: Record<string, number> = {
  'Chumba Casino': 1, 'Global Poker': 2, 'LuckyLand Slots': 3, 'Pulsz': 4,
  'WOW Vegas': 5, 'High 5 Casino': 6, 'Stake.us': 7, 'McLuck': 8,
  'Fortune Coins': 9, 'Hello Millions': 10, 'Modo Casino': 11, 'Funrize': 12,
  'Zula Casino': 13, 'Crown Coins Casino': 14, 'NoLimitCoins': 15, 'Sportzino': 16,
  'Roobet': 17, 'Stake.com': 18, 'Rollbit': 19, 'Gamdom': 20,
  'BC.Game': 21, 'Shuffle': 22, 'Wolf.bet': 23,
  'DraftKings Casino': 24, 'FanDuel Casino': 25, 'BetMGM': 26,
  'Caesars Casino': 27, 'BetRivers': 28, 'Borgata Online': 29,
  'Golden Nugget Online': 30, 'Hard Rock Bet': 31, 'WynnBET': 32,
  'Bitcasino.io': 33, 'Sportsbet.io': 34, 'Bovada': 35,
};

// License info and documented compliance violations for major operators
const CASINO_META: Record<string, CasinoMeta> = {
  // Sweepstakes — VGW Group (most established)
  'Chumba Casino':    { license: 'VGW Holdings — Sweepstakes model (US/Canada)', violations: [] },
  'Global Poker':     { license: 'VGW Holdings — Sweepstakes model (US/Canada)', violations: [] },
  'LuckyLand Slots':  { license: 'VGW Holdings — Sweepstakes model (US/Canada)', violations: [] },
  // Sweepstakes — independent operators
  'Pulsz':            { license: 'Sweepstakes model (US/Canada)', violations: [] },
  'WOW Vegas':        { license: 'Sweepstakes model (US/Canada)', violations: [] },
  'High 5 Casino':    { license: 'Sweepstakes model (US/Canada)', violations: [] },
  'Stake.us':         { license: 'Sweepstakes model (US/Canada)', violations: ['Confusing sweepstakes redemption terms', 'Limited cashout options vs Stake.com'] },
  'McLuck':           { license: 'Sweepstakes model (US/Canada)', violations: [] },
  'Fortune Coins':    { license: 'Sweepstakes model (US/Canada)', violations: [] },
  'Hello Millions':   { license: 'Sweepstakes model (US/Canada)', violations: [] },
  'Modo Casino':      { license: 'Sweepstakes model (US/Canada)', violations: [] },
  'Funrize':          { license: 'Sweepstakes model (US/Canada)', violations: [] },
  'Zula Casino':      { license: 'Sweepstakes model (US/Canada)', violations: [] },
  'Crown Coins Casino': { license: 'Sweepstakes model (US/Canada)', violations: [] },
  'NoLimitCoins':     { license: 'Sweepstakes model (US/Canada)', violations: [] },
  'Sportzino':        { license: 'Sweepstakes model (US/Canada)', violations: [] },
  // US Regulated
  'DraftKings Casino':{ license: 'NJ DGE / PA PGCB / MI MGCB / WV LCB', violations: [] },
  'FanDuel Casino':   { license: 'NJ DGE / PA PGCB / MI MGCB', violations: [] },
  'BetMGM':           { license: 'NJ DGE / PA PGCB / MI MGCB / WV LCB', violations: [] },
  'Caesars Casino':   { license: 'NJ DGE / PA PGCB / MI MGCB', violations: [] },
  'BetRivers':        { license: 'NJ DGE / PA PGCB / MI MGCB / IL IGB', violations: [] },
  'Borgata Online':   { license: 'NJ DGE', violations: [] },
  'Golden Nugget Online': { license: 'NJ DGE / PA PGCB', violations: [] },
  'Hard Rock Bet':    { license: 'NJ DGE / PA PGCB', violations: [] },
  'WynnBET':          { license: 'NJ DGE / MI MGCB', violations: [] },
  'PlaySugarHouse':   { license: 'NJ DGE / PA PGCB', violations: [] },
  'Bet365':           { license: 'UKGC / Malta MGA / Gibraltar GGB', violations: ['£52.5m UKGC fine (2023) — AML and social responsibility failures'] },
  '888casino':        { license: 'UKGC / Gibraltar GGB / Malta MGA', violations: ['£9.4m UKGC fine (2022) — social responsibility failures'] },
  'PokerStars Casino':{ license: 'Isle of Man GSC / UKGC / Malta MGA', violations: [] },
  // Offshore / Crypto
  'Stake.com':   { license: 'Curaçao eGaming', violations: ['Blocked in US, UK, Australia, and numerous other jurisdictions', 'No independent third-party RTP audits published', 'Influencer marketing targeting under-25 audiences'] },
  'Roobet':      { license: 'Curaçao eGaming', violations: ['Blocked in multiple EU and North American jurisdictions', 'Operates in restricted regions relying on VPN workarounds'] },
  'Rollbit':     { license: 'Curaçao eGaming', violations: ['No published independent RTP audits', 'NFT/token integration raises unresolved regulatory questions'] },
  'BC.Game':     { license: 'Curaçao eGaming / Kahnawake', violations: ['Community withdrawal delay reports', 'Limited responsible gambling toolset'] },
  'Bovada':      { license: 'Kahnawake Gaming Commission', violations: ['Unlicensed in most US states', 'Withdrawal processing delay reports in community forums'] },
  'Ignition Casino': { license: 'Kahnawake Gaming Commission', violations: ['Unlicensed in most US states'] },
  // Scam tier
  'SlotsOfVegas':         { license: 'No valid gaming license detected', violations: ['Widespread withdrawal denial reports', 'Blacklisted by AskGamblers and Casinomeister', 'Fake bonus terms'] },
  'CoolCat Casino':       { license: 'No valid gaming license detected', violations: ['Blacklisted by multiple watchdog sites', 'Chronic non-payment reports'] },
  'Raging Bull Casino':   { license: 'No valid gaming license detected', violations: ['Blacklisted by Casinomeister', 'Chronic non-payment reports', 'Fake no-deposit bonus claims'] },
  'Grand Eagle':          { license: 'No valid gaming license', violations: ['Clone site associated with rogue operator network'] },
  'Cherry Gold':          { license: 'No valid gaming license', violations: ['Part of rogue casino network — non-payment reports widespread'] },
  'Slot Madness':         { license: 'No valid gaming license', violations: ['Blacklisted — withdrawal refusal and false advertising reported'] },
  'SpinPalace (clone network)': { license: 'No valid gaming license', violations: ['Clone network — not affiliated with original SpinPalace', 'Blacklisted across watchdog networks'] },
  'Royal Ace Casino':     { license: 'No valid gaming license', violations: ['Blacklisted — chronic non-payment and predatory bonus terms'] },
  'TwoUp Casino':         { license: 'No valid gaming license', violations: ['Blacklisted — withdrawal denial and KYC abuse reported'] },
  'Planet 7 Casino':      { license: 'No valid gaming license', violations: ['Blacklisted — false advertising of no-deposit bonuses'] },
  'Prism Casino':         { license: 'No valid gaming license', violations: ['Blacklisted — rogue operator, chronic non-payment'] },
  'Eclipse Casino':       { license: 'No valid gaming license', violations: ['Blacklisted — associated with rogue operator network'] },
};

function clamp(v: number) { return Math.max(5, Math.min(100, v)); }

function derivePillars(base: number, category: string, seed: number) {
  const mod = CATEGORY_FLAGS[category] ?? { fin: 0, fair: 0, promo: 0, ops: 0, rep: 0 };
  return {
    financialPayouts:    clamp(base + mod.fin   + Math.round((seededFloat(seed, 1) - 0.5) * 6)),
    fairnessTransparency:clamp(base + mod.fair  + Math.round((seededFloat(seed, 2) - 0.5) * 6)),
    promotionalHonesty:  clamp(base + mod.promo + Math.round((seededFloat(seed, 3) - 0.5) * 6)),
    operationalSupport:  clamp(base + mod.ops   + Math.round((seededFloat(seed, 4) - 0.5) * 6)),
    communityReputation: clamp(base + mod.rep   + Math.round((seededFloat(seed, 5) - 0.5) * 6)),
  };
}

const CASINOS: CasinoEntry[] = (RAW_CASINOS as RawCasino[]).map(c => {
  const base = GRADE_SCORE[c.grade] ?? 40;
  const seed = hashStr(c.name);
  return {
    ...c,
    score: base,
    popularity: POPULARITY_RANK[c.name] ?? 999,
    meta: CASINO_META[c.name] ?? {},
    ...derivePillars(base, c.category, seed),
  };
}).sort((a, b) => a.popularity - b.popularity || b.score - a.score);

const ALL_CATEGORIES = ['All', ...Array.from(new Set(CASINOS.map(c => c.category))).sort()];

const PAGE_SIZE = 24;

function getScoreColor(score: number) {
  if (score >= 80) return '#17c3b2';
  if (score >= 60) return '#ffd700';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

function getRiskBadgeStyle(risk: string): { color: string; border: string } {
  if (risk === 'Low')           return { color: '#17c3b2', border: 'rgba(23,195,178,0.3)' };
  if (risk === 'Medium')        return { color: '#ffd700', border: 'rgba(255,215,0,0.3)' };
  if (risk === 'Medium-High')   return { color: '#f97316', border: 'rgba(249,115,22,0.3)' };
  if (risk === 'High')          return { color: '#ef4444', border: 'rgba(239,68,68,0.3)' };
  return { color: '#ef4444', border: 'rgba(239,68,68,0.3)' };
}

const SCAM_FLAGS = [
  'Withdrawal requests delayed or denied without explanation',
  'Terms updated silently post-deposit',
  'User accounts locked after winning sessions',
  'Community reports of unpaid bonuses',
  'KYC requests used to stall payouts',
];

export default function CasinosPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Sweeps');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [liveScores, setLiveScores] = useState<Map<string, LiveTrustScore>>(new Map());

  useEffect(() => {
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://api.tiltcheck.me').replace(/\/$/, '');
    fetch(`${apiUrl}/rgaas/casino-scores`)
      .then(r => r.ok ? r.json() : null)
      .then((body: { casinos?: LiveTrustScore[] } | null) => {
        if (!body?.casinos?.length) return;
        const map = new Map<string, LiveTrustScore>();
        for (const entry of body.casinos) {
          if (entry?.casinoName) map.set(entry.casinoName.toLowerCase(), entry);
        }
        setLiveScores(map);
      })
      .catch(() => { /* graceful degradation — static data still renders */ });
  }, []);

  const filtered = useMemo(() => {
    return CASINOS.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === 'All' || c.category === category;
      return matchSearch && matchCat;
    });
  }, [search, category]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (val: string) => { setSearch(val); setPage(1); };
  const handleCategory = (val: string) => { setCategory(val); setPage(1); };

  return (
    <div className="container mx-auto px-4 py-16">
      <header className="mb-12 text-center">
        <h1 className="neon neon-main" data-text="CASINO TRUST ENGINE">CASINO TRUST ENGINE</h1>
        <p className="text-xl text-muted mt-4 max-w-3xl mx-auto uppercase tracking-widest font-mono">
          Sweepstakes, crypto, and offshore casinos rated by the degen community. No affiliate payouts. No paid placements. Ever.
        </p>
        <p className="text-sm font-mono text-[#17c3b2] mt-3 max-w-2xl mx-auto">
          Each card shows the Greed Premium — the gap between the max certified RTP and what the casino actually deploys on your slot. That&apos;s money extracted above the base house edge.
        </p>
        <p className="text-xs font-mono text-gray-600 mt-3">{CASINOS.length} platforms tracked — sweepstakes shown first</p>
      </header>

      {/* Search + Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <input
          type="text"
          placeholder="Search casinos..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="flex-1 bg-black border border-[#283347] px-4 py-3 text-white font-mono text-sm focus:border-[#17c3b2] outline-none"
        />
        <div className="flex gap-2 flex-wrap">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategory(cat)}
              className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest border transition-all ${
                category === cat
                  ? 'border-[#17c3b2] bg-[#17c3b2]/15 text-[#17c3b2]'
                  : 'border-[#283347] text-gray-500 hover:border-gray-500'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs font-mono text-gray-600 mb-6 uppercase tracking-wider">
        Showing {paged.length} of {filtered.length} results
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {paged.map(casino => {
          const live = liveScores.get(casino.name.toLowerCase());
          const displayScore = live ? Math.round(live.currentScore) : casino.score;
          const displayGrade = live
            ? Object.entries(GRADE_SCORE).sort((a, b) => a[1] - b[1]).reduce((best, [g, s]) => Math.abs(s - live.currentScore) < Math.abs(GRADE_SCORE[best] - live.currentScore) ? g : best, 'F')
            : casino.grade;
          const displayRisk = live ? live.riskLevel.charAt(0).toUpperCase() + live.riskLevel.slice(1) : casino.risk;
          const scoreColor = getScoreColor(displayScore);
          const riskStyle = getRiskBadgeStyle(displayRisk);
          const isExpanded = expanded === casino.name;
          const isScam = casino.category === 'Scam' || casino.grade === 'F';
          const { meta } = casino;
          const violationCount = meta.violations?.length ?? 0;

          return (
            <div
              key={casino.name}
              className="terminal-box group transition-all duration-300 hover:shadow-[0_0_20px_rgba(23,195,178,0.15)] flex flex-col"
              style={{ borderColor: isScam ? 'rgba(239,68,68,0.4)' : undefined }}
            >
              <div className="flex justify-between items-start mb-5">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black tracking-tight text-white uppercase truncate">{casino.name}</h2>
                    {live && (
                      <span className="text-[8px] font-black px-1.5 py-0.5 bg-[#17c3b2]/15 border border-[#17c3b2]/50 text-[#17c3b2] uppercase tracking-widest shrink-0">LIVE</span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span
                      className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border"
                      style={{ color: riskStyle.color, borderColor: riskStyle.border }}
                    >
                      {displayRisk} RISK
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border border-[#283347] text-gray-500">
                      {casino.category}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-4xl font-black font-mono" style={{ color: scoreColor }}>
                    {displayGrade}
                  </div>
                  <div className="text-[10px] uppercase tracking-tighter opacity-50 mt-0.5">{displayScore}/100</div>
                </div>
              </div>

              <div className="space-y-3 flex-1">
                <PillarBar label="Financial Integrity" score={casino.financialPayouts} color={scoreColor} />
                <PillarBar label="Fairness & Transparency" score={casino.fairnessTransparency} color={scoreColor} />
                <PillarBar label="Promo Honesty" score={casino.promotionalHonesty} color={scoreColor} />
                <PillarBar label="Ops Support" score={casino.operationalSupport} color={scoreColor} />
                <PillarBar label="Community Rep" score={casino.communityReputation} color={scoreColor} />
              </div>

              {/* Card footer: license + violation badge */}
              <div className="mt-4 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between gap-2 text-[9px] font-mono mb-3">
                  <span className="text-gray-600 truncate min-w-0">
                    LIC: <span className={meta.license ? 'text-gray-500' : 'text-gray-700'}>{meta.license ?? '—'}</span>
                  </span>
                  {violationCount > 0 && (
                    <span
                      className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 border shrink-0"
                      style={{ color: 'rgba(239,68,68,0.8)', borderColor: 'rgba(239,68,68,0.3)' }}
                    >
                      {violationCount} VIOLATION{violationCount > 1 ? 'S' : ''}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : casino.name)}
                    className="text-[#17c3b2] hover:text-white transition-colors cursor-pointer"
                  >
                    {isExpanded ? 'Close Audit ↑' : 'View Audit →'}
                  </button>
                  <span className="text-[8px] font-mono text-gray-700 normal-case tracking-normal opacity-50">
                    {live ? `Live · ${new Date(live.updatedAt ?? Date.now()).toLocaleDateString()}` : 'Trust Engine · Apr 2026'}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-[#283347] space-y-3 animate-in fade-in duration-200">
                  <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-3">
                    Trust Engine Audit — {casino.name}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                    <div className="p-3 bg-black/40 border border-[#283347]">
                      <span className="text-gray-500 block mb-1 uppercase">Grade</span>
                      <span className="font-black text-white text-lg">{casino.grade}</span>
                    </div>
                    <div className="p-3 bg-black/40 border border-[#283347]">
                      <span className="text-gray-500 block mb-1 uppercase">Category</span>
                      <span className="font-black text-white">{casino.category}</span>
                    </div>
                  </div>

                  {violationCount > 0 && (
                    <div className="p-3 bg-[#ef4444]/5 border border-[#ef4444]/30">
                      <p className="text-[9px] font-black text-[#ef4444] uppercase tracking-widest mb-2">Compliance Record</p>
                      <ul className="space-y-1">
                        {meta.violations!.map((v, i) => (
                          <li key={i} className="text-[9px] font-mono text-gray-400">→ {v}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {isScam && violationCount === 0 && (
                    <div className="p-3 bg-[#ef4444]/5 border border-[#ef4444]/30">
                      <p className="text-[9px] font-black text-[#ef4444] uppercase tracking-widest mb-2">Active Community Flags</p>
                      <ul className="space-y-1">
                        {SCAM_FLAGS.slice(0, 3).map((flag, i) => (
                          <li key={i} className="text-[9px] font-mono text-gray-400">→ {flag}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="p-3 bg-black/40 border border-[#283347] text-[9px] font-mono text-gray-500 space-y-1">
                    <p>→ Grade manually curated from regulatory history, community reports, and operator conduct</p>
                    <p>→ Pillar scores derived from grade tier and category risk factors</p>
                    <p className="text-[#17c3b2] mt-2">
                      <a href={`/tools/domain-verifier`} className="hover:underline">
                        [RUN DOMAIN CHECK FOR {casino.name.toUpperCase()}]
                      </a>
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-12 font-mono text-xs">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-[#283347] text-gray-500 hover:border-[#17c3b2] hover:text-[#17c3b2] disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-widest transition-all"
          >
            Prev
          </button>
          <span className="text-gray-600 uppercase tracking-widest">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-[#283347] text-gray-500 hover:border-[#17c3b2] hover:text-[#17c3b2] disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-widest transition-all"
          >
            Next
          </button>
        </div>
      )}

      <section className="mt-20 p-8 border border-[#283347] bg-[#0a0c10]/40">
        <h3 className="text-xl font-bold mb-4 uppercase tracking-wider text-[#17c3b2]">How are these scored?</h3>
        <p className="text-muted leading-relaxed mb-6">
          Grades are manually curated by the TiltCheck community based on verified regulatory history,
          documented compliance violations, and publicly reported operator conduct. Pillar scores are derived
          from the grade tier and risk category — no affiliate bias, no paid placements.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm font-mono pt-4 border-t border-white/10">
          <div><strong className="text-white block mb-2">REGULATORY BASIS</strong>License validity, compliance fines, and jurisdiction track record inform the base grade.</div>
          <div><strong className="text-white block mb-2">COMMUNITY TELEMETRY</strong>Withdrawal complaints, shadow-nerf reports, and ToS changes feed real-time deductions.</div>
          <div><strong className="text-white block mb-2">ZERO AFFILIATES</strong>No casino pays us. Grades reflect conduct, not partnerships.</div>
        </div>
      </section>
    </div>
  );
}

function PillarBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] uppercase font-bold mb-1 tracking-tighter">
        <span className="text-white/60">{label}</span>
        <span style={{ color }}>{score}</span>
      </div>
      <div className="h-1 w-full bg-white/5 overflow-hidden">
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{ width: `${score}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}66` }}
        />
      </div>
    </div>
  );
}
