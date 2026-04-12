// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-11
'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface Region {
  code: string;
  name: string;
  flag: string;
  status: 'legal' | 'restricted' | 'illegal' | 'grey';
  operator: string;
  regulator: string;
  notes: string;
  selfExclusion: string;
  links: { label: string; url: string }[];
}

const REGIONS: Region[] = [
  {
    code: 'GB',
    name: 'United Kingdom',
    flag: 'UK',
    status: 'legal',
    operator: 'Online gambling is fully regulated.',
    regulator: 'UK Gambling Commission (UKGC)',
    notes: 'One of the most regulated markets globally. Operators must hold a UKGC license. Self-exclusion available via GAMSTOP.',
    selfExclusion: 'GAMSTOP — gamstop.co.uk',
    links: [{ label: 'UKGC', url: 'https://www.gamblingcommission.gov.uk' }],
  },
  {
    code: 'US',
    name: 'United States',
    flag: 'US',
    status: 'restricted',
    operator: 'State-by-state. Some states allow online casino + sports betting; others ban all online play.',
    regulator: 'State gaming commissions (NJ DGE, PA PGCB, etc.)',
    notes: 'PASPA repeal (2018) opened sports betting. Online casino legal in NJ, PA, MI, WV, CT, DE. Many offshore sites operate in a grey area. No federal licensing.',
    selfExclusion: 'State-specific. Check your state gaming board.',
    links: [
      { label: 'American Gaming Association', url: 'https://www.americangaming.org' },
      { label: 'Legal Sports Betting Map', url: 'https://www.legalsportsreport.com/sports-betting/state-by-state/' },
    ],
  },
  {
    code: 'AU',
    name: 'Australia',
    flag: 'AU',
    status: 'restricted',
    operator: 'Sports betting and racing legal. Online casino (pokies, table games) banned for residents.',
    regulator: 'Australian Communications and Media Authority (ACMA)',
    notes: 'Interactive Gambling Act 2001 prohibits online casino games for Australians. Offshore sites regularly blocked. Sports betting legal with licensed providers.',
    selfExclusion: 'BetStop — betstop.com.au (national register)',
    links: [{ label: 'ACMA', url: 'https://www.acma.gov.au' }],
  },
  {
    code: 'CA',
    name: 'Canada',
    flag: 'CA',
    status: 'legal',
    operator: 'Provincially regulated. Ontario has open market. Other provinces run government monopolies.',
    regulator: 'Alcohol and Gaming Commission of Ontario (AGCO); provincial boards elsewhere',
    notes: 'Ontario launched regulated private market in 2022. BC, AB, MB, SK operate government-run iGaming. Quebec expanding. Most provinces still allow offshore in grey area.',
    selfExclusion: 'GameSense — via your provincial provider',
    links: [{ label: 'AGCO iGaming Ontario', url: 'https://igamingontario.ca' }],
  },
  {
    code: 'DE',
    name: 'Germany',
    flag: 'DE',
    status: 'legal',
    operator: 'Online slots and sports betting regulated since 2021. Poker allowed. Casino table games restricted.',
    regulator: 'GGL (Gemeinsame Glucksspielbehorde der Lander)',
    notes: 'New State Treaty (GlüStV 2021) allows licensed operators. Deposit limit 1,000 EUR/month. Poker and sports OK. Live dealer games not yet permitted.',
    selfExclusion: 'OASIS — self-exclusion system run by GGL',
    links: [{ label: 'GGL', url: 'https://www.gluecksspiel-behoerde.de' }],
  },
  {
    code: 'NL',
    name: 'Netherlands',
    flag: 'NL',
    status: 'legal',
    operator: 'Regulated online gambling market since October 2021.',
    regulator: 'Kansspelautoriteit (KSA)',
    notes: 'Remote Gambling Act opened licensing. Strict player protection rules including mandatory reality checks, cool-off periods, and deposit limits.',
    selfExclusion: 'CRUKS — national exclusion register',
    links: [{ label: 'KSA', url: 'https://www.kansspelautoriteit.nl' }],
  },
  {
    code: 'SE',
    name: 'Sweden',
    flag: 'SE',
    status: 'legal',
    operator: 'Fully licensed market since 2019.',
    regulator: 'Spelinspektionen',
    notes: 'Gambling Act 2019 opened the market. Operators must hold Swedish license. Deposit limits, cool-down periods, and Spelpaus exclusion mandatory.',
    selfExclusion: 'Spelpaus — spelpaus.se',
    links: [{ label: 'Spelinspektionen', url: 'https://www.spelinspektionen.se' }],
  },
  {
    code: 'IN',
    name: 'India',
    flag: 'IN',
    status: 'grey',
    operator: 'No federal online gambling law. State-level rules vary widely.',
    regulator: 'No unified national regulator',
    notes: 'Goa, Sikkim, and a few states allow licensed casinos. Most states have no specific online gambling law. Skill gaming (rummy, fantasy sports) broadly accepted. Offshore sites operate in grey area.',
    selfExclusion: 'No national system. Limited state resources.',
    links: [],
  },
  {
    code: 'JP',
    name: 'Japan',
    flag: 'JP',
    status: 'restricted',
    operator: 'Most gambling forms illegal. Horse racing, cycling, motorboat racing, and lottery allowed.',
    regulator: 'Japan Racing Association; prefectural commissions',
    notes: 'Pachinko operates in a legal grey area (winnings exchanged at nearby shops, not on-site). Integrated Resort (casino) legislation passed 2018 but first venues still years away.',
    selfExclusion: 'No national online system.',
    links: [],
  },
  {
    code: 'BR',
    name: 'Brazil',
    flag: 'BR',
    status: 'legal',
    operator: 'Sports betting legalized 2023. Full iGaming regulation rolling out.',
    regulator: 'SPA (Secretaria de Premios e Apostas) under Ministry of Finance',
    notes: 'Sports betting (apostas de quota fixa) fully legal. Online casino regulation live as of 2024. Licensing rollout ongoing. Offshore sites remain accessible.',
    selfExclusion: 'Autoexclusao via licensed operators',
    links: [],
  },
  {
    code: 'KR',
    name: 'South Korea',
    flag: 'KR',
    status: 'illegal',
    operator: 'Online gambling is illegal for Korean residents. One government-run casino (Kangwon Land) allows locals.',
    regulator: 'Game Rating and Administration Committee',
    notes: 'Foreign casinos legal for non-residents. Online gambling by residents carries criminal penalties. Sports Toto and lottery government-run.',
    selfExclusion: 'No national online system.',
    links: [],
  },
  {
    code: 'NG',
    name: 'Nigeria',
    flag: 'NG',
    status: 'legal',
    operator: 'Regulated at federal and state level. Fast-growing market.',
    regulator: 'National Lottery Regulatory Commission (NLRC); state commissions',
    notes: 'Federal licensing covers sports betting, lotteries, and online gaming. Lagos State Gaming Board is most active. Offshore operations common. Mobile-first market.',
    selfExclusion: 'No centralized national system.',
    links: [],
  },
];

const STATUS_META: Record<Region['status'], { label: string; color: string; bg: string; border: string }> = {
  legal:      { label: 'LEGAL',      color: 'text-[#17c3b2]', bg: 'bg-[#17c3b2]/10', border: 'border-[#17c3b2]/30' },
  restricted: { label: 'RESTRICTED', color: 'text-[#ffd700]', bg: 'bg-[#ffd700]/10', border: 'border-[#ffd700]/30' },
  illegal:    { label: 'ILLEGAL',    color: 'text-red-400',    bg: 'bg-red-950/20',    border: 'border-red-500/30' },
  grey:       { label: 'GREY AREA',  color: 'text-gray-400',   bg: 'bg-gray-800/30',   border: 'border-gray-600/30' },
};

type FilterStatus = 'all' | Region['status'];

export default function GeoLawsPage() {
  const [selected, setSelected] = useState<Region | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');

  const visible = REGIONS.filter((r) => {
    const matchFilter = filter === 'all' || r.status === filter;
    const matchSearch =
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      {/* Hero */}
      <section className="border-b border-[#283347] py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-4">
            REGULATORY AWARENESS
          </p>
          <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tight mb-6">
            GEO LAWS
          </h1>
          <p className="text-gray-400 font-mono text-base max-w-2xl leading-relaxed">
            Online gambling laws vary wildly by country. This is a reference guide — not legal advice. Know your jurisdiction, know your regulator, know your self-exclusion options before you deposit anywhere.
          </p>
          <p className="mt-4 text-xs font-mono text-gray-600">
            Last updated: 2026-04-11. Laws change. Verify with official sources.
          </p>
        </div>
      </section>

      {/* Filter + Search */}
      <section className="border-b border-[#283347] py-6 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search region..."
            className="bg-[#0a0c10] border border-[#283347] px-4 py-2 text-white font-mono text-sm focus:border-[#17c3b2] outline-none placeholder-gray-600 w-full sm:w-64"
          />
          <div className="flex gap-2 flex-wrap">
            {(['all', 'legal', 'restricted', 'grey', 'illegal'] as FilterStatus[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                  filter === f
                    ? 'border-[#17c3b2] bg-[#17c3b2]/10 text-[#17c3b2]'
                    : 'border-[#283347] text-gray-500 hover:border-gray-500'
                }`}
              >
                {f === 'all' ? 'All' : STATUS_META[f].label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Region grid */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {visible.length === 0 ? (
            <p className="text-gray-500 font-mono text-sm text-center py-12">No regions match your filter.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map((region) => {
                const meta = STATUS_META[region.status];
                return (
                  <button
                    key={region.code}
                    onClick={() => setSelected(selected?.code === region.code ? null : region)}
                    className={`text-left border p-6 transition-colors w-full ${
                      selected?.code === region.code
                        ? `${meta.border} ${meta.bg}`
                        : 'border-[#283347] bg-[#111827]/40 hover:border-[#283347]/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="text-2xl font-black font-mono text-gray-500">{region.flag}</span>
                      <span
                        className={`text-[10px] font-black font-mono uppercase tracking-widest px-2 py-0.5 border ${meta.border} ${meta.color} ${meta.bg}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-white font-black uppercase text-sm tracking-tight">{region.name}</p>
                    <p className="text-gray-500 font-mono text-xs mt-1 line-clamp-2">{region.regulator}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Region detail panel */}
      {selected && (
        <section className="border-t border-[#283347] py-12 px-4">
          <div className="max-w-3xl mx-auto">
            <div className={`border ${STATUS_META[selected.status].border} ${STATUS_META[selected.status].bg} p-8 space-y-6`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-xs font-mono uppercase tracking-widest mb-1 ${STATUS_META[selected.status].color}`}>
                    {STATUS_META[selected.status].label}
                  </p>
                  <h2 className="text-2xl font-black uppercase tracking-tight">{selected.name}</h2>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-gray-600 hover:text-white font-mono text-sm transition-colors"
                >
                  CLOSE
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-1">Regulator</p>
                  <p className="text-white font-mono text-sm">{selected.regulator}</p>
                </div>
                <div>
                  <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-1">Status Overview</p>
                  <p className="text-gray-300 font-mono text-sm leading-relaxed">{selected.operator}</p>
                </div>
                <div>
                  <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-1">Details</p>
                  <p className="text-gray-400 font-mono text-sm leading-relaxed">{selected.notes}</p>
                </div>
                <div>
                  <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-1">Self-Exclusion</p>
                  <p className="text-[#17c3b2] font-mono text-sm">{selected.selfExclusion}</p>
                </div>
                {selected.links.length > 0 && (
                  <div>
                    <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-2">Official Links</p>
                    <div className="flex flex-wrap gap-3">
                      {selected.links.map((l) => (
                        <a
                          key={l.url}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-black uppercase tracking-widest px-3 py-1.5 border border-[#283347] text-gray-400 hover:border-[#17c3b2] hover:text-[#17c3b2] transition-colors"
                        >
                          {l.label} &rarr;
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs font-mono text-gray-600 border-t border-[#283347] pt-4">
                This is informational only — not legal advice. Consult a qualified lawyer for your jurisdiction.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Disclaimer */}
      <section className="border-t border-[#283347] py-10 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <p className="text-xs font-mono text-gray-600 uppercase tracking-widest">LEGAL DISCLAIMER</p>
          <p className="text-gray-500 font-mono text-xs leading-relaxed">
            This guide is for informational purposes only. TiltCheck is not a law firm and this content is not legal advice. Online gambling laws change frequently. Always verify current regulations with official government sources or a qualified legal professional in your jurisdiction before participating in any gambling activity.
          </p>
        </div>
      </section>

      <section className="border-t border-[#283347] py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/tools" className="text-xs font-mono text-gray-500 hover:text-[#17c3b2] transition-colors uppercase tracking-widest">
            &larr; All Tools
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#283347] py-6 px-4 text-center">
        <p className="text-xs text-gray-600 font-mono">Made for Degens. By Degens.</p>
      </footer>
    </main>
  );
}
