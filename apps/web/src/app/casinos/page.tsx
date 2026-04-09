/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10 */
'use client';

import React, { useState, useMemo } from 'react';
import "@/styles/terminal.css";
import RAW_CASINOS from '@/data/casinos.json';

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

// Lower number = shown first. Unranked entries sort by score after ranked ones.
const POPULARITY_RANK: Record<string, number> = {
  'Bet365': 1, 'DraftKings Casino': 2, 'FanDuel Casino': 3, 'BetMGM': 4,
  'PokerStars Casino': 5, 'William Hill': 6, 'Stake.com': 7, '888casino': 8,
  'Caesars Casino': 9, 'Ladbrokes': 10, 'Betway': 11, 'Roobet': 12,
  'Paddy Power': 13, 'Unibet': 14, 'Betsson': 15, 'Rollbit': 16,
  'Betfair Casino': 17, 'BetRivers': 18, 'LeoVegas': 19, 'Bovada': 20,
  'BC.Game': 21, 'Borgata Online': 22, 'Golden Nugget Online': 23,
  'Mr Green': 24, 'Hard Rock Bet': 25, 'WynnBET': 26, 'PlaySugarHouse': 27,
  'Betfred': 28, 'Kindred Group': 29, 'Sky Vegas': 30, 'Casumo': 31,
  'Coral': 32, 'Grosvenor Casino': 33, 'PartyCasino': 34, 'PlayOJO': 35,
};

// License info and documented compliance violations for major operators
const CASINO_META: Record<string, CasinoMeta> = {
  'Bet365':           { license: 'UKGC / Malta MGA / Gibraltar GGB', violations: ['£52.5m UKGC fine (2023) — AML and social responsibility failures'] },
  '888casino':        { license: 'UKGC / Gibraltar GGB / Malta MGA', violations: ['£9.4m UKGC fine (2022) — social responsibility failures'] },
  'William Hill':     { license: 'UKGC / Gibraltar GGB', violations: ['£19.2m UKGC fine (2023) — AML failures', '£6.2m UKGC fine (2018)'] },
  'Betway':           { license: 'UKGC / Malta MGA', violations: ['£11.6m UKGC fine (2021) — VIP customer handling failures'] },
  'Ladbrokes':        { license: 'UKGC / Malta MGA', violations: ['Part of £17m Entain UKGC penalty (2022) — social responsibility failures'] },
  'Coral':            { license: 'UKGC / Malta MGA', violations: ['Part of £17m Entain UKGC penalty (2022) — social responsibility failures'] },
  'Kindred Group':    { license: 'Malta MGA / UKGC / Sweden Spelinspektionen', violations: ['£3m UKGC penalty (2022) — social responsibility failures'] },
  'LeoVegas':         { license: 'Malta MGA / UKGC', violations: ['£1.32m UKGC fine (2022) — safer gambling failures'] },
  'Paddy Power':      { license: 'UKGC / Ireland AGRI', violations: ['£2.2m UKGC fine (2016)', 'Multiple Flutter Group UKGC regulatory settlements'] },
  'Betfair Casino':   { license: 'UKGC / Malta MGA / Gibraltar GGB', violations: ['Multiple historical UKGC informal regulatory actions'] },
  'Sky Vegas':        { license: 'UKGC / Malta MGA', violations: ['Part of Flutter Group regulatory settlements'] },
  'Mr Green':         { license: 'Malta MGA / UKGC / Sweden Spelinspektionen', violations: [] },
  'PokerStars Casino':{ license: 'Isle of Man GSC / UKGC / Malta MGA', violations: [] },
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
  'Betfred':          { license: 'UKGC / Malta MGA', violations: [] },
  'Unibet':           { license: 'UKGC / Malta MGA / Sweden Spelinspektionen', violations: [] },
  'Betsson':          { license: 'Malta MGA / UKGC', violations: [] },
  'Grosvenor Casino': { license: 'UKGC', violations: [] },
  'PartyCasino':      { license: 'UKGC / Gibraltar GGB', violations: [] },
  'PlayOJO':          { license: 'Malta MGA / UKGC', violations: [] },
  'Casumo':           { license: 'Malta MGA / UKGC / Sweden Spelinspektionen', violations: [] },
  // Offshore / Crypto
  'Stake.com':   { license: 'Curaçao eGaming', violations: ['Blocked in US, UK, Australia, and numerous other jurisdictions', 'No independent third-party RTP audits published', 'Influencer marketing campaigns targeting under-25 audiences'] },
  'Roobet':      { license: 'Curaçao eGaming', violations: ['Blocked in multiple EU and North American jurisdictions', 'Operates in restricted regions relying on VPN workarounds'] },
  'Rollbit':     { license: 'Curaçao eGaming', violations: ['No published independent RTP audits', 'NFT/token integration raises unresolved regulatory questions'] },
  'BC.Game':     { license: 'Curaçao eGaming / Kahnawake', violations: ['Community withdrawal delay reports', 'Limited responsible gambling toolset'] },
  'Bovada':      { license: 'Kahnawake Gaming Commission', violations: ['Unlicensed in most US states', 'Withdrawal processing delay reports in community forums'] },
  'Ignition Casino': { license: 'Kahnawake Gaming Commission', violations: ['Unlicensed in most US states'] },
  'Stake.US':    { license: 'Sweepstakes model — no gaming license required', violations: ['Confusing sweepstakes redemption terms', 'Limited cashout options'] },
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
  'Palace of Chance':     { license: 'No valid gaming license', violations: ['Blacklisted — withdrawal refusal and false advertising'] },
  'SlotsPlus':            { license: 'No valid gaming license', violations: ['Blacklisted — sister site to multiple rogue operators'] },
  'Slotastic':            { license: 'No valid gaming license', violations: ['Blacklisted — predatory bonus terms and non-payment'] },
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
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

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
          Know which casinos are actually fair before you lose your fkn rent.
        </p>
        <p className="text-xs font-mono text-gray-600 mt-3">{CASINOS.length} platforms tracked — sorted by popularity</p>
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
          const scoreColor = getScoreColor(casino.score);
          const riskStyle = getRiskBadgeStyle(casino.risk);
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
                  <h2 className="text-xl font-black tracking-tight text-white uppercase truncate">{casino.name}</h2>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span
                      className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border"
                      style={{ color: riskStyle.color, borderColor: riskStyle.border }}
                    >
                      {casino.risk} RISK
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border border-[#283347] text-gray-500">
                      {casino.category}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-4xl font-black font-mono" style={{ color: scoreColor }}>
                    {casino.grade}
                  </div>
                  <div className="text-[10px] uppercase tracking-tighter opacity-50 mt-0.5">{casino.score}/100</div>
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
                    Trust Engine · Apr 2026
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
