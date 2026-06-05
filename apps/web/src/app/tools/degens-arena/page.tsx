/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
import type { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';
import ToolPageHeader from '@/components/ToolPageHeader';

const STEPS = [
  {
    title: 'Join a round',
    body: 'Activity for fast tests. Discord for public drops after rules clear review.',
  },
  {
    title: 'Answer fast',
    body: 'Gambling math, RTP, crypto, degen culture — skill only, no house edge.',
  },
  {
    title: 'Claim the drop',
    body: 'Clout and priority now. SOL drops wait on published rules and legal review.',
  },
];

export const metadata: Metadata = {
  title: 'TiltCheck | Live Trivia',
  description: 'Live TriviaDrop — skill-only rounds, voluntary treasury, Activity test surface.',
};

export default function DegensArenaPage() {
  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <ToolPageHeader
        eyebrow="Live trivia"
        title="Skill-only chaos"
        description="Off-ramp when the casino tab needs to die. No reels, no rake dressed as fun."
        actions={
          <>
            <a
              href="https://activity.tiltcheck.me"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary px-5 py-2.5 text-[11px] font-black"
            >
              Open Activity
            </a>
            <Link href="/pay/jackpot?amount=1" className="btn btn-secondary px-5 py-2.5 text-[11px] font-black">
              Treasury
            </Link>
            <a
              href="https://discord.gg/gdBsEJfCar"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-[#283347] px-5 py-2.5 text-[11px] font-black uppercase tracking-wider text-white hover:border-[#17c3b2] hover:text-[#17c3b2]"
            >
              Discord
            </a>
          </>
        }
      />

      <section className="px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 text-center text-xs">
            {[
              ['Format', 'Live trivia'],
              ['Treasury', '/pay/jackpot'],
              ['Test', 'Activity'],
              ['Public drops', 'Discord'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-[#283347] bg-black/30 px-3 py-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">{label}</p>
                <p className="mt-1 font-black uppercase text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <article key={step.title} className="rounded-xl border border-[#283347] bg-black/30 p-5">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#17c3b2]">Step {index + 1}</p>
                <h2 className="mt-2 text-lg font-black uppercase tracking-tight">{step.title}</h2>
                <p className="mt-2 text-sm text-gray-400 leading-relaxed">{step.body}</p>
              </article>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
            Need a hard pivot?{' '}
            <Link href="/touch-grass" className="text-[#17c3b2] hover:underline">
              Touch Grass
            </Link>
            {' · '}
            <Link href="/tools" className="text-[#17c3b2] hover:underline">
              All tools
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
