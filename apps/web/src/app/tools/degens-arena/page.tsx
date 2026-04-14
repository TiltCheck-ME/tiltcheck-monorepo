/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-14 */
import type { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';

const HOW_IT_WORKS = [
  {
    eyebrow: '01 // QUEUE UP',
    title: 'Jump into a live round',
    body: 'TriviaDrop runs fast rounds built for degens who want action without opening another casino tab. Join from Discord now. Web arena follows after that.',
  },
  {
    eyebrow: '02 // ANSWER FAST',
    title: 'Skill decides the outcome',
    body: 'Questions hit gambling strategy, RTP math, crypto, internet filth, and degen culture. No reels. No rake disguised as fun. Just who knows the answer first.',
  },
  {
    eyebrow: '03 // CLAIM THE DROP',
    title: 'Top players take the bag',
    body: 'Winners take SOL drops, community clout, and early access priority for future arena formats. If you are sharp, you get paid for being sharp.',
  },
];

const REASONS_TO_JOIN = [
  'No house edge. No slots. No fake “entertainment” tax.',
  'Built to redirect tilt energy into something skill-based.',
  'Discord rounds are already live via /triviadrop.',
  'Web version is being shaped around actual community play patterns.',
];

const ROUND_FORMAT = [
  {
    title: 'Instant drops',
    body: 'Short-notice rounds for whoever is online and ready to move. Good for fast chaos. Good for cooldown windows.',
  },
  {
    title: 'Scheduled events',
    body: 'Larger rounds with bigger prize attention, better prep time, and more bodies in queue.',
  },
  {
    title: 'Cooldown activation',
    body: 'Long term, the arena becomes the clean redirect when TiltCheck tells you to stop chasing losses.',
  },
];

const RELATED_SURFACES = [
  {
    title: 'Join the live Discord drops',
    href: 'https://discord.gg/gdBsEJfCar',
    external: true,
    body: 'This is where /triviadrop lives right now. If you want rounds today, start there.',
    cta: 'Join Discord',
  },
  {
    title: 'Run the audit tools',
    href: '/tools',
    body: 'When the trivia ends, the toolkit is still here: RTP drift, house edge, phishing checks, and the rest.',
    cta: 'Open tools',
  },
  {
    title: 'Get on the beta list',
    href: '/beta-tester',
    body: 'Want early access when the web arena opens up? Get your name in before public launch.',
    cta: 'Apply for beta',
  },
  {
    title: 'Hit Touch Grass instead',
    href: '/touch-grass',
    body: 'If you need a hard pivot away from gambling tabs, use the anti-spiral page and keep moving.',
    cta: 'Open Touch Grass',
  },
];

export const metadata: Metadata = {
  title: 'TiltCheck | Live Trivia',
  description: 'Live TriviaDrop details, round format, and where to join the skill-only SOL drop experience.',
};

export default function DegensArenaPage() {
  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <section className="border-b border-[#283347] px-4 py-24 md:py-32">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-4 text-xs font-mono uppercase tracking-[0.35em] text-[#17c3b2]">LIVE TRIVIA // TRIVIADROP</p>
            <h1 className="neon neon-main mb-6 text-5xl md:text-7xl" data-text="SKILL-ONLY CHAOS">
              SKILL-ONLY CHAOS
            </h1>
            <div className="mb-6 inline-flex flex-wrap items-center gap-3 border border-[#17c3b2]/30 bg-[#17c3b2]/5 px-4 py-3">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#17c3b2]">Discord live now</span>
              <span className="hidden h-1 w-1 rounded-full bg-[#17c3b2] sm:block" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ffd700]">Web arena in build</span>
            </div>
            <p className="max-w-2xl text-lg leading-relaxed text-gray-300 md:text-xl">
              Live trivia for degens who want action without feeding a house edge. Answer fast. Beat the room. Take the SOL drop. The game zone is not on web yet, but the format, flow, and access path are live.
            </p>
            <p className="mt-5 max-w-2xl text-sm font-mono leading-relaxed text-gray-500">
              Current live entry point: <span className="text-[#17c3b2]">/triviadrop</span> in Discord. This page is the web-side briefing for what it is, how it works, and where it fits in the TiltCheck loop.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="https://discord.gg/gdBsEJfCar"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary px-6 py-3 font-black"
              >
                Join Live Drops
              </a>
              <Link href="/tools" className="btn btn-secondary px-6 py-3 font-black">
                See All Tools
              </Link>
              <Link href="/beta-tester" className="border border-[#283347] px-6 py-3 text-sm font-black uppercase tracking-widest text-white transition-colors hover:border-[#17c3b2] hover:text-[#17c3b2]">
                Get Web Access Updates
              </Link>
            </div>
          </div>

          <div className="grid w-full max-w-xl grid-cols-2 gap-4">
            {[
              ['Format', 'Live trivia drops'],
              ['Payout Logic', 'Skill only'],
              ['Current Surface', 'Discord /triviadrop'],
              ['Future Surface', 'Web arena during cooldown'],
            ].map(([label, value]) => (
              <div key={label} className="border border-[#283347] bg-black/30 p-5">
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500">{label}</p>
                <p className="mt-3 text-base font-black uppercase tracking-wide text-white md:text-lg">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-3xl">
            <p className="mb-3 text-xs font-mono uppercase tracking-[0.35em] text-[#17c3b2]">WHAT IT IS</p>
            <h2 className="text-3xl font-black uppercase tracking-tight md:text-4xl">A competitive off-ramp, not another casino loop</h2>
            <p className="mt-4 text-base leading-relaxed text-gray-400">
              Live trivia exists to give players something sharp and social to do when the gambling tab needs to die. It keeps the pace, strips out the house edge, and replaces bankroll bleed with a skill contest the room can actually win.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {HOW_IT_WORKS.map((item) => (
                <article key={item.title} className="border border-[#283347] bg-black/30 p-6">
                  <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#17c3b2]">{item.eyebrow}</p>
                  <h3 className="mt-4 text-xl font-black uppercase tracking-tight text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-400">{item.body}</p>
                </article>
              ))}
            </div>

            <aside className="border border-[#17c3b2]/30 bg-[#17c3b2]/5 p-6">
              <p className="text-xs font-mono uppercase tracking-[0.35em] text-[#17c3b2]">WHY JOIN</p>
              <ul className="mt-5 space-y-4 text-sm leading-relaxed text-gray-300">
                {REASONS_TO_JOIN.map((reason) => (
                  <li key={reason} className="flex gap-3">
                    <span className="mt-1 text-[#17c3b2]">▹</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-y border-[#283347] bg-black/30 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-3xl">
            <p className="mb-3 text-xs font-mono uppercase tracking-[0.35em] text-[#ffd700]">HOW ROUNDS WORK</p>
            <h2 className="text-3xl font-black uppercase tracking-tight md:text-4xl">Fast rounds. Clean rules. No fake edge.</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {ROUND_FORMAT.map((item) => (
              <article key={item.title} className="border border-[#283347] bg-[#111827]/40 p-6">
                <h3 className="text-xl font-black uppercase tracking-tight text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">{item.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 border border-[#283347] bg-black/40 p-6 md:p-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-mono uppercase tracking-[0.35em] text-gray-500">Question mix</p>
                <p className="mt-3 text-sm leading-relaxed text-gray-300">
                  Expect gambling math, RTP logic, bankroll survival, crypto basics, internet culture, and the kind of degen knowledge that should probably not be useful but is.
                </p>
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-[0.35em] text-gray-500">TiltCheck role</p>
                <p className="mt-3 text-sm leading-relaxed text-gray-300">
                  The long-term job is simple: when TiltCheck tells you to cool off, trivia becomes the safer place to dump that energy instead of lighting another deposit on fire.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-3xl">
            <p className="mb-3 text-xs font-mono uppercase tracking-[0.35em] text-[#17c3b2]">NEXT MOVES</p>
            <h2 className="text-3xl font-black uppercase tracking-tight md:text-4xl">Pick the surface that matches what you need</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {RELATED_SURFACES.map((item) => {
              const cardClasses = 'flex h-full flex-col justify-between border border-[#283347] bg-black/30 p-6 transition-colors hover:border-[#17c3b2]/50 hover:bg-[#17c3b2]/5';

              const content = (
                <>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-gray-400">{item.body}</p>
                  </div>
                  <div className="mt-6 text-[11px] font-black uppercase tracking-[0.3em] text-[#17c3b2]">{item.cta} →</div>
                </>
              );

              if (item.external) {
                return (
                  <a key={item.title} href={item.href} target="_blank" rel="noopener noreferrer" className={cardClasses}>
                    {content}
                  </a>
                );
              }

              return (
                <Link key={item.title} href={item.href} className={cardClasses}>
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
