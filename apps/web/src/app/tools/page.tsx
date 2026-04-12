// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-11
import React from 'react';
import Link from 'next/link';

interface Tool {
  href: string;
  label: string;
  title: string;
  description: string;
  status: 'live' | 'beta' | 'soon';
}

const TOOLS: Tool[] = [
  {
    href: '/tools/verify',
    label: 'THE RECEIPT',
    title: 'Provably Fair Verifier',
    description: 'Independent bet verification using the TiltCheck 4-Key Lock or legacy server/client seed model. Calculates HMAC-SHA256 hashes against live Solana blockhashes. Math does not lie.',
    status: 'live',
  },
  {
    href: '/tools/session-stats',
    label: 'RTP DRIFT MONITOR',
    title: 'Slot Math Index',
    description: 'Certified RTP tier spreads across 100+ slot titles. Shows the spread between the max and min RTP a casino can legally configure — and the greed premium they pocket from that gap.',
    status: 'live',
  },
  {
    href: '/tools/house-edge-scanner',
    label: 'THE DELTA ENGINE',
    title: 'House Edge Calculator',
    description: 'Input your certified vs observed RTP and session data. Get your personal greed premium overcharge and a statistical confidence score on whether the variance is real or manufactured.',
    status: 'live',
  },
  {
    href: '/tools/domain-verifier',
    label: 'PHISHING SHIELD',
    title: 'Domain + Email Verifier',
    description: 'Scan casino domains for license validity, phishing signals, SPF/SSL anomalies, and bonus extraction. Paste a suspicious email to identify impersonation attempts before they cost you.',
    status: 'live',
  },
  {
    href: '/tools/scan-scams',
    label: 'SHADOW-BAN TRACKER',
    title: 'Casino Restriction Log',
    description: 'Community-reported withdrawal delays, account locks, silent ToS changes, and payout denials. Updated from Discord reports and the Trust Engine. Named, dated, severity-graded.',
    status: 'live',
  },
  {
    href: '/tools/collectclock',
    label: 'COLLECTCLOCK',
    title: 'Bonus Timing Tracker',
    description: 'Cooldown logic for casino bonuses by provider. Know when your daily reload, streak bonus, or deposit match resets — and whether the amount has drifted since your last claim.',
    status: 'live',
  },
  {
    href: '/tools/justthetip',
    label: 'JUST THE TIP',
    title: 'SOL Peer Tipping',
    description: 'Send SOL tips to other degens via Discord username. Non-custodial — keys never leave your wallet. Web UI is live. Execution via Discord in the interim.',
    status: 'beta',
  },
  {
    href: '/tools/auto-vault',
    label: 'LOCKVAULT',
    title: 'Auto Profit Lock',
    description: 'Set a profit trigger and the vault locks your gains on-chain automatically. Non-custodial. You set the threshold, the math enforces it. Vault writes pending backend connection.',
    status: 'beta',
  },
  {
    href: '/tools/buddy-system',
    label: 'BUDDY SYSTEM',
    title: 'Accountability Partner',
    description: 'Add a trusted degen as your accountability partner. They get Discord DM alerts when your tilt score spikes, losses stack, or balance hits zero. You set the thresholds.',
    status: 'beta',
  },
  {
    href: '/tools/geo-laws',
    label: 'GEO LAWS',
    title: 'Regulation by Region',
    description: 'Online gambling laws by country — legal status, regulator, self-exclusion programs, and official links. Know your jurisdiction before you deposit anywhere.',
    status: 'live',
  },
  {
    href: '/tools/degens-arena',
    label: 'DEGENS ARENA',
    title: 'Trivia Drop Arena',
    description: 'Web-based trivia battle for up to 10,000 concurrent players. Skill-only SOL prize drops, zero house edge. Activates automatically when the extension locks your session. Available now on Discord via /triviadrop.',
    status: 'soon',
  },
];

function StatusBadge({ status }: { status: Tool['status'] }) {
  if (status === 'live') {
    return (
      <span className="inline-block text-[10px] font-black font-mono uppercase tracking-widest px-2 py-0.5 border border-[#17c3b2]/50 text-[#17c3b2] bg-[#17c3b2]/10">
        LIVE
      </span>
    );
  }
  if (status === 'beta') {
    return (
      <span className="inline-block text-[10px] font-black font-mono uppercase tracking-widest px-2 py-0.5 border border-[#ffd700]/50 text-[#ffd700] bg-[#ffd700]/10">
        BETA
      </span>
    );
  }
  return (
    <span className="inline-block text-[10px] font-black font-mono uppercase tracking-widest px-2 py-0.5 border border-gray-600/50 text-gray-500 bg-gray-800/30">
      IN DEV
    </span>
  );
}

export default function ToolsIndexPage() {
  const live = TOOLS.filter((t) => t.status === 'live');
  const beta = TOOLS.filter((t) => t.status === 'beta');
  const soon = TOOLS.filter((t) => t.status === 'soon');

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">

      {/* Hero */}
      <section className="border-b border-[#283347] py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-4">TILTCHECK TOOLKIT</p>
          <h1 className="neon neon-main text-5xl md:text-7xl mb-6" data-text="THE TOOLS">
            THE TOOLS
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto font-mono leading-relaxed">
            Math-backed, no-fluff utilities for degens who want receipts. Verify bets. Track bonuses. Scan scams. Lock wins. Every tool here does one thing — and actually does it.
          </p>
        </div>
      </section>

      {/* Live Tools */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-mono text-[#17c3b2] uppercase tracking-widest mb-10">
            Live — {live.length} tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {live.map((tool) => (
              <ToolCard key={tool.href} tool={tool} />
            ))}
          </div>
        </div>
      </section>

      {/* Beta Tools */}
      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-mono text-[#ffd700] uppercase tracking-widest mb-10">
            Beta — {beta.length} tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {beta.map((tool) => (
              <ToolCard key={tool.href} tool={tool} />
            ))}
          </div>
        </div>
      </section>

      {/* In Dev */}
      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-10">
            In Development — {soon.length} tool
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {soon.map((tool) => (
              <ToolCard key={tool.href} tool={tool} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-[#283347] py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-4">WANT MORE</p>
          <p className="text-gray-400 font-mono text-sm mb-6">
            The extension runs all of these in real-time, inside your casino tab, without switching windows.
          </p>
          <Link
            href="/beta-tester"
            className="inline-block border border-[#17c3b2] text-[#17c3b2] font-black uppercase tracking-widest text-sm px-8 py-3 hover:bg-[#17c3b2] hover:text-black transition-colors"
          >
            Get the Extension
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#283347] py-6 px-4 text-center">
        <p className="text-xs text-gray-600 font-mono">Made for Degens. By Degens.</p>
      </footer>
    </main>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const isDisabled = tool.status === 'soon';

  const cardContent = (
    <div
      className={`h-full p-8 border transition-colors ${
        isDisabled
          ? 'border-gray-700/30 bg-[#111827]/20 cursor-default'
          : 'border-[#283347] bg-[#111827]/40 hover:border-[#17c3b2]/40 hover:bg-[#17c3b2]/5 cursor-pointer'
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <p className="text-[10px] font-black font-mono text-gray-500 uppercase tracking-widest">
          {tool.label}
        </p>
        <StatusBadge status={tool.status} />
      </div>
      <h3 className={`text-xl font-black uppercase tracking-tight mb-3 ${isDisabled ? 'text-gray-600' : 'text-white'}`}>
        {tool.title}
      </h3>
      <p className={`text-sm font-mono leading-relaxed ${isDisabled ? 'text-gray-600' : 'text-gray-400'}`}>
        {tool.description}
      </p>
    </div>
  );

  if (isDisabled) return <div key={tool.href}>{cardContent}</div>;

  return (
    <Link href={tool.href} className="block h-full">
      {cardContent}
    </Link>
  );
}
