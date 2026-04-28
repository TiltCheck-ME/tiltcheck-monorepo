/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-20 */
import type { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';

const COMMUNITY_JACKPOT_WALLET = 'DLP9VYyuLze7VZ7oMG6S77YT3BxZZBDJniTFx1NeDcem';
const DEFAULT_AMOUNT_SOL = 1;
const MAX_AMOUNT_SOL = 25;

function parseAmount(value: string | undefined): number {
  if (!value) {
    return DEFAULT_AMOUNT_SOL;
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_AMOUNT_SOL;
  }

  return Math.min(MAX_AMOUNT_SOL, Number.parseFloat(parsed.toFixed(4)));
}

export const metadata: Metadata = {
  title: 'TiltCheck | Fund Trivia Jackpot',
  description: 'Fund the live TiltCheck trivia jackpot with a direct Solana wallet transfer.',
};

export default async function JackpotFundingPage({
  searchParams,
}: {
  searchParams: Promise<{ amount?: string }>;
}) {
  const { amount } = await searchParams;
  const amountSol = parseAmount(amount);
  const solanaPayHref =
    `solana:${COMMUNITY_JACKPOT_WALLET}?amount=${amountSol.toFixed(4)}` +
    '&label=TiltCheck%20Trivia%20Jackpot&message=Funding%20the%20live%20trivia%20pot';

  return (
    <main className="min-h-screen bg-[#0a0c10] px-4 py-24 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <section className="border border-[#17c3b2]/30 bg-[#17c3b2]/5 p-8 md:p-10">
          <p className="text-xs font-mono uppercase tracking-[0.35em] text-[#17c3b2]">
            LIVE TRIVIA // JACKPOT FUNDING
          </p>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-tight md:text-6xl">
            FUND THE POT
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-gray-300 md:text-lg">
            This is the missing funding rail behind <span className="text-[#17c3b2]">/jackpot fuel</span>.
            Send SOL straight to the public trivia wallet, then use the Activity or Discord to run the round.
            No custody. No fake balance in our database. Your wallet signs the move.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="border border-[#283347] bg-black/30 p-5">
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500">Suggested amount</p>
              <p className="mt-3 text-3xl font-black uppercase tracking-wide text-[#17c3b2]">
                {amountSol.toFixed(4)} SOL
              </p>
            </div>
            <div className="border border-[#283347] bg-black/30 p-5">
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500">Funding wallet</p>
              <p className="mt-3 break-all text-sm font-bold text-white">
                {COMMUNITY_JACKPOT_WALLET}
              </p>
            </div>
            <div className="border border-[#283347] bg-black/30 p-5">
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500">Next step</p>
              <p className="mt-3 text-sm font-bold uppercase tracking-wide text-white">
                Fund, then test the room
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href={solanaPayHref}
              className="btn btn-primary px-6 py-3 font-black"
            >
              Open Solana Pay
            </a>
            <a
              href="https://activity.tiltcheck.me"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary px-6 py-3 font-black"
            >
              Open Activity
            </a>
            <a
              href="https://discord.gg/gdBsEJfCar"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-[#283347] px-6 py-3 text-sm font-black uppercase tracking-widest text-white transition-colors hover:border-[#17c3b2] hover:text-[#17c3b2]"
            >
              Open Discord
            </a>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <article className="border border-[#283347] bg-black/30 p-6">
            <p className="text-xs font-mono uppercase tracking-[0.35em] text-[#17c3b2]">01 // FUND</p>
            <h2 className="mt-4 text-2xl font-black uppercase tracking-tight">Move SOL direct</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              Use the Solana Pay link above or copy the wallet address into your own wallet app. The jackpot wallet is public and the transfer is direct.
            </p>
          </article>
          <article className="border border-[#283347] bg-black/30 p-6">
            <p className="text-xs font-mono uppercase tracking-[0.35em] text-[#17c3b2]">02 // TEST</p>
            <h2 className="mt-4 text-2xl font-black uppercase tracking-tight">Run the room loop</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              Use the Activity to start a fast pack and validate join, prompt, reveal, and recap flow. Discord is still the community launch rail when you need the full drop crowd.
            </p>
          </article>
          <article className="border border-[#283347] bg-black/30 p-6">
            <p className="text-xs font-mono uppercase tracking-[0.35em] text-[#17c3b2]">03 // STAY HONEST</p>
            <h2 className="mt-4 text-2xl font-black uppercase tracking-tight">No custody</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              TiltCheck does not hold your keys, mint fake credits, or pretend wallet transfers happened. If you do not sign, nothing moves.
            </p>
          </article>
        </section>

        <section className="border border-[#283347] bg-black/30 p-6 md:p-8">
          <p className="text-xs font-mono uppercase tracking-[0.35em] text-[#ffd700]">COPY / PASTE IF NEEDED</p>
          <code className="mt-4 block overflow-x-auto border border-[#283347] bg-[#05070a] p-4 text-sm text-[#17c3b2]">
            {COMMUNITY_JACKPOT_WALLET}
          </code>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <Link href="/tools/degens-arena" className="text-[#17c3b2] hover:underline">
              Back to live trivia
            </Link>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400">Made for Degens. By Degens.</span>
          </div>
        </section>
      </div>
    </main>
  );
}
