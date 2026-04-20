/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */

"use client";

import React from 'react';
import Link from 'next/link';

export default function TouchGrassPage() {
  const [activeTab, setActiveTab] = React.useState<'immediate' | 'resources' | 'support'>('immediate');

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <section className="border-b border-[#ef4444]/30 py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-6 text-[#ef4444]">
            TOUCH GRASS PROTOCOL
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            You're here because TiltCheck locked you out, or you made the choice to lock yourself out. Either way, you're finally taking control. We're not judging. We're here to help.
          </p>
        </div>
      </section>

      <section className="py-12 px-4 bg-[#ef4444]/10 border-b border-[#ef4444]/30">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-base md:text-lg font-bold text-[#ef4444]">
            NEED IMMEDIATE HELP? <span className="text-white font-mono">1-800-GAMBLER (1-800-426-2537)</span> — Available 24/7
          </p>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-4 mb-12 border-b border-[#283347] overflow-x-auto">
            <button
              onClick={() => setActiveTab('immediate')}
              className={`px-6 py-3 font-black uppercase text-sm tracking-tight border-b-2 transition-colors ${
                activeTab === 'immediate'
                  ? 'border-[#ef4444] text-[#ef4444]'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              Right Now
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`px-6 py-3 font-black uppercase text-sm tracking-tight border-b-2 transition-colors ${
                activeTab === 'resources'
                  ? 'border-[#ef4444] text-[#ef4444]'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              Resources
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`px-6 py-3 font-black uppercase text-sm tracking-tight border-b-2 transition-colors ${
                activeTab === 'support'
                  ? 'border-[#ef4444] text-[#ef4444]'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              The Real Talk
            </button>
          </div>

          {/* Tab 1: Right Now */}
          {activeTab === 'immediate' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="p-8 border border-[#ef4444]/40 bg-[#ef4444]/5 space-y-6">
                <div>
                  <h3 className="text-lg font-black uppercase mb-3 text-[#ef4444]">Step 1: Stop Playing</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Close the casino. Close the browser. Put the phone in another room. <strong className="text-white">The urge to get it back is dopamine talking, not your brain.</strong>
                  </p>
                </div>
                <div className="pt-6 border-t border-[#ef4444]/20">
                  <h3 className="text-lg font-black uppercase mb-3 text-[#ef4444]">Step 2: Tell Someone</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Not your buddy who gambles. Your parent. Your partner. <strong className="text-white">Someone who will care and won&apos;t enable you. It&apos;s hard. Do it anyway.</strong>
                  </p>
                </div>
                <div className="pt-6 border-t border-[#ef4444]/20">
                  <h3 className="text-lg font-black uppercase mb-3 text-[#ef4444]">Step 3: Count What You Lost</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Don&apos;t estimate. Write it down. Look at it. <strong className="text-white">The number is real. You can&apos;t fix it tonight.</strong>
                  </p>
                </div>
                <div className="pt-6 border-t border-[#ef4444]/20">
                  <h3 className="text-lg font-black uppercase mb-3 text-[#ef4444]">Step 4: Seek Help</h3>
                  <p className="text-gray-400 leading-relaxed">
                    <strong className="text-white">Call 1-800-GAMBLER (1-800-426-2537).</strong> Free. Confidential. They&apos;ve heard it all.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Resources */}
          {activeTab === 'resources' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="p-6 border border-[#17c3b2]/30 bg-[#17c3b2]/5">
                <h3 className="text-lg font-black uppercase mb-4 text-[#17c3b2]">Crisis Hotlines (24/7)</h3>
                <div className="space-y-3 text-gray-400">
                  <p><strong className="text-white">National Problem Gambling Helpline:</strong><br/><span className="text-[#17c3b2] font-mono font-bold">1-800-GAMBLER (1-800-426-2537)</span></p>
                  <p><strong className="text-white">Crisis Text Line:</strong><br/>Text <span className="text-[#17c3b2] font-mono font-bold">HOME</span> to <span className="text-[#17c3b2] font-mono font-bold">741741</span></p>
                  <p><strong className="text-white">National Suicide Prevention:</strong><br/><span className="text-[#17c3b2] font-mono font-bold">988</span> (if you're in a dark place)</p>
                </div>
              </div>

              <div className="p-6 border border-[#17c3b2]/30 bg-[#17c3b2]/5">
                <h3 className="text-lg font-black uppercase mb-4 text-[#17c3b2]">Support Organizations</h3>
                <div className="space-y-3 text-gray-400 text-sm">
                  <p><strong className="text-white">Gamblers Anonymous:</strong><br/><a href="https://www.gamblersanonymous.org" target="_blank" rel="noopener noreferrer" className="text-[#17c3b2] hover:underline font-mono">gamblersanonymous.org</a> — Free meetings, peer support</p>
                  <p><strong className="text-white">NCPG:</strong><br/><a href="https://www.ncpg.org" target="_blank" rel="noopener noreferrer" className="text-[#17c3b2] hover:underline font-mono">ncpg.org</a> — Chat support, referrals, resources</p>
                  <p><strong className="text-white">For Family Members:</strong><br/><a href="https://www.gam-anon.org" target="_blank" rel="noopener noreferrer" className="text-[#17c3b2] hover:underline font-mono">gam-anon.org</a> — Support for loved ones</p>
                </div>
              </div>

              <div className="p-6 border border-[#17c3b2]/30 bg-[#17c3b2]/5">
                <h3 className="text-lg font-black uppercase mb-4 text-[#17c3b2]">Finding Professional Help</h3>
                <div className="space-y-2 text-gray-400 text-sm">
                  <p>• Ask your doctor for a therapist specializing in addiction</p>
                  <p>• Check your insurance for behavioral health coverage</p>
                  <p>• Many therapists offer sliding scale rates if cost is an issue</p>
                  <p>• Community health centers often have low-cost mental health services</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: The Real Talk */}
          {activeTab === 'support' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="p-8 border border-[#17c3b2]/30 bg-[#17c3b2]/5 space-y-4">
                <h2 className="text-2xl font-black uppercase text-[#17c3b2]">The Science Is Real</h2>
                <p className="text-gray-400 leading-relaxed">
                  Gambling addiction isn't weakness. It's neurobiology. Your brain on gambling lights up like your brain on heroin. That's not an exaggeration — it's what the brain imaging shows. Dopamine loops. Reward pathways going haywire. Your brain demanding more, more, more.
                </p>
              </div>

              <div className="p-8 border border-[#17c3b2]/30 bg-[#17c3b2]/5 space-y-4">
                <h2 className="text-2xl font-black uppercase text-[#17c3b2]">And Recovery Is Real Too</h2>
                <p className="text-gray-400 leading-relaxed">
                  Millions of people have gotten help and stopped gambling. They didn't "fix" themselves alone. They got therapy, support groups, and real intervention. And it worked. You can be one of those people.
                </p>
              </div>

              <div className="p-8 border border-[#17c3b2]/30 bg-[#17c3b2]/5 space-y-4">
                <h2 className="text-2xl font-black uppercase text-[#17c3b2]">About TiltCheck</h2>
                <p className="text-gray-400 leading-relaxed">
                  This tool is harm reduction. It's not a replacement for treatment. If you're using TiltCheck and hitting limits frequently, that's your signal that you need actual professional help. Use this as a bridge, not a finish line.
                </p>
              </div>

              <div className="p-8 border border-[#17c3b2]/30 bg-[#17c3b2]/5 space-y-4">
                <h2 className="text-2xl font-black uppercase text-[#17c3b2]">The Shame Isn't Your Fault</h2>
                <p className="text-gray-400 leading-relaxed">
                  You're going to feel embarrassed. Maybe angry at yourself. That's normal. But you're not broken. You're just human. And reaching out for help isn't weakness — it's the bravest thing you can do right now.
                </p>
              </div>

              <div className="p-8 border border-[#17c3b2]/30 bg-[#17c3b2]/5 space-y-4">
                <h2 className="text-2xl font-black uppercase text-[#17c3b2]">Test Yourself Honestly</h2>
                <p className="text-gray-400 text-sm mb-4">Answer these truthfully:</p>
                <ul className="space-y-2 text-gray-400 text-sm">
                  <li>• Do you lie about how much you gamble?</li>
                  <li>• Have you tried to cut back but couldn't?</li>
                  <li>• Do you gamble to escape negative feelings?</li>
                  <li>• Have you missed work or family because of gambling?</li>
                  <li>• Have you lost money you couldn't afford to lose?</li>
                  <li>• Have you borrowed money or sold stuff to gamble?</li>
                  <li>• Do people you care about express concern?</li>
                  <li>• Do you need bigger bets for the same rush?</li>
                </ul>
                <p className="text-gray-400 text-sm mt-4">
                  If you said yes to 3+ of these: You're not alone. About 2.2 million American adults have a disorder like this. And they got help. So can you.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Degen Side Quests */}
      <section className="py-16 px-4 border-t border-[#283347]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-2 text-white">Degen Side Quests</h2>
          <p className="text-gray-500 font-mono text-sm mb-10 uppercase tracking-widest">
            You need something to do with your hands. Pick a quest. Do not open a casino tab.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

            <a
              href="/tools/degens-arena"
              className="p-6 border border-[#17c3b2]/30 bg-[#17c3b2]/5 hover:bg-[#17c3b2]/10 hover:border-[#17c3b2]/60 transition-all group block"
            >
              <div className="text-[#17c3b2] font-black uppercase text-xs tracking-widest mb-2">MULTIPLAYER</div>
              <h3 className="text-lg font-black text-white uppercase mb-2 group-hover:text-[#17c3b2] transition-colors">Degen Arena</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Skill-based multiplayer games. No house edge. No casino. You vs other degens. The only way to get rinsed here is by being bad.
              </p>
              <div className="mt-4 text-[10px] font-mono text-[#17c3b2] uppercase tracking-widest">Enter Arena →</div>
            </a>

            <a
              href="/tools/verify"
              className="p-6 border border-[#17c3b2]/30 bg-[#17c3b2]/5 hover:bg-[#17c3b2]/10 hover:border-[#17c3b2]/60 transition-all group block"
            >
              <div className="text-[#17c3b2] font-black uppercase text-xs tracking-widest mb-2">TOOL</div>
              <h3 className="text-lg font-black text-white uppercase mb-2 group-hover:text-[#17c3b2] transition-colors">Manual Bet Verifier</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Re-run the raw HMAC math for one bet from your last session. Good for receipts. Not a seed hygiene audit or full trust read.
              </p>
              <div className="mt-4 text-[10px] font-mono text-[#17c3b2] uppercase tracking-widest">Run Check →</div>
            </a>

            <a
              href="/casinos"
              className="p-6 border border-gray-700/50 bg-gray-800/20 hover:bg-gray-700/30 hover:border-gray-500/60 transition-all group block"
            >
              <div className="text-gray-400 font-black uppercase text-xs tracking-widest mb-2">INTEL</div>
              <h3 className="text-lg font-black text-white uppercase mb-2 group-hover:text-[#17c3b2] transition-colors">Casino Trust Engine</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Read what TiltCheck actually has on the casino you just played. Compliance violations, license status, community flags. Cold water.
              </p>
              <div className="mt-4 text-[10px] font-mono text-gray-400 group-hover:text-[#17c3b2] uppercase tracking-widest">Read the File →</div>
            </a>

            <a
              href="https://discord.gg/gdBsEJfCar"
              target="_blank"
              rel="noopener noreferrer"
              className="p-6 border border-[#5865f2]/30 bg-[#5865f2]/5 hover:bg-[#5865f2]/10 hover:border-[#5865f2]/60 transition-all group block"
            >
              <div className="text-[#5865f2] font-black uppercase text-xs tracking-widest mb-2">COMMUNITY</div>
              <h3 className="text-lg font-black text-white uppercase mb-2 group-hover:text-[#5865f2] transition-colors">Hit the Discord</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Talk to real people. Other degens who have been exactly where you are. The chat is free. The cope is free. Show up.
              </p>
              <div className="mt-4 text-[10px] font-mono text-[#5865f2] uppercase tracking-widest">Join Server →</div>
            </a>

            <a
              href="/bonuses"
              className="p-6 border border-[#17c3b2]/30 bg-[#17c3b2]/5 hover:bg-[#17c3b2]/10 hover:border-[#17c3b2]/60 transition-all group block"
            >
              <div className="text-[#17c3b2] font-black uppercase text-xs tracking-widest mb-2">INTEL</div>
              <h3 className="text-lg font-black text-white uppercase mb-2 group-hover:text-[#17c3b2] transition-colors">Bonus Scanner</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                If you&apos;re going to come back, at least know what&apos;s claimable before you put another dollar in. Use the data. Work smarter.
              </p>
              <div className="mt-4 text-[10px] font-mono text-[#17c3b2] uppercase tracking-widest">Scan Bonuses →</div>
            </a>

            <a
              href="/microgrant"
              className="p-6 border border-[#ef4444]/30 bg-[#ef4444]/5 hover:bg-[#ef4444]/10 hover:border-[#ef4444]/60 transition-all group block"
            >
              <div className="text-[#ef4444] font-black uppercase text-xs tracking-widest mb-2">COMMUNITY FUND</div>
              <h3 className="text-lg font-black text-white uppercase mb-2 group-hover:text-[#ef4444] transition-colors">Recovery Microgrant</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Up to 1 SOL. One-time. No loans, no lectures. If you&apos;re in a hole and can&apos;t see out, apply. Seeded by degens who climbed out of the same one.
              </p>
              <div className="mt-4 text-[10px] font-mono text-[#ef4444] uppercase tracking-widest">Check Eligibility →</div>
            </a>

            <a
              href="https://stakaestats.net"
              target="_blank"
              rel="noopener noreferrer"
              className="p-6 border border-gray-700/50 bg-gray-800/20 hover:bg-gray-700/30 hover:border-gray-500/60 transition-all group block"
            >
              <div className="text-gray-400 font-black uppercase text-xs tracking-widest mb-2">INTEL</div>
              <h3 className="text-lg font-black text-white uppercase mb-2 group-hover:text-[#17c3b2] transition-colors">Stake Stats Archive</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Full gameplay archive and VIP calculator for Stake. Look up what level you&apos;re actually at, what the rakeback math says, and whether the house is treating your volume fairly.
              </p>
              <div className="mt-4 text-[10px] font-mono text-gray-400 group-hover:text-[#17c3b2] uppercase tracking-widest">Open StakaeStats →</div>
            </a>

            <a
              href="/tools/house-edge-scanner"
              className="p-6 border border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10 hover:border-yellow-500/60 transition-all group block"
            >
              <div className="text-yellow-500 font-black uppercase text-xs tracking-widest mb-2">MATH</div>
              <h3 className="text-lg font-black text-white uppercase mb-2 group-hover:text-yellow-500 transition-colors">Run the Numbers</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Calculate exactly what the house edge cost you across your last session. The anger is productive. Let it land.
              </p>
              <div className="mt-4 text-[10px] font-mono text-yellow-500 uppercase tracking-widest">Open Delta Engine →</div>
            </a>

            <a
              href="/tools/auto-vault"
              className="p-6 border border-[#17c3b2]/30 bg-[#17c3b2]/5 hover:bg-[#17c3b2]/10 hover:border-[#17c3b2]/60 transition-all group block"
            >
              <div className="text-[#17c3b2] font-black uppercase text-xs tracking-widest mb-2">PROTECTION</div>
              <h3 className="text-lg font-black text-white uppercase mb-2 group-hover:text-[#17c3b2] transition-colors">Set Hard Limits Now</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                While you&apos;re out of session and thinking clearly, set the limits for next time. It&apos;s harder to override them when you&apos;re not tilted. Do it now.
              </p>
              <div className="mt-4 text-[10px] font-mono text-[#17c3b2] uppercase tracking-widest">Configure AutoVault →</div>
            </a>

            <a
              href="https://lichess.org"
              target="_blank"
              rel="noopener noreferrer"
              className="p-6 border border-gray-700/50 bg-gray-800/20 hover:bg-gray-700/30 hover:border-gray-500/60 transition-all group block"
            >
              <div className="text-gray-400 font-black uppercase text-xs tracking-widest mb-2">SKILL GAME</div>
              <h3 className="text-lg font-black text-white uppercase mb-2 group-hover:text-[#17c3b2] transition-colors">Play Chess</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Free. Skill-only. No RNG. No house. You either played better or you didn&apos;t. Lichess is open source and runs fast puzzles in under 3 minutes.
              </p>
              <div className="mt-4 text-[10px] font-mono text-gray-400 group-hover:text-[#17c3b2] uppercase tracking-widest">Go to Lichess →</div>
            </a>

            <a
              href="https://www.youtube.com/results?search_query=casino+slot+machine+design+psychology"
              target="_blank"
              rel="noopener noreferrer"
              className="p-6 border border-gray-700/50 bg-gray-800/20 hover:bg-gray-700/30 hover:border-gray-500/60 transition-all group block"
            >
              <div className="text-gray-400 font-black uppercase text-xs tracking-widest mb-2">WATCH</div>
              <h3 className="text-lg font-black text-white uppercase mb-2 group-hover:text-[#17c3b2] transition-colors">How Slots Are Designed</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Watch how machine designers engineer near-misses, sound cues, and reward loops to keep you seated. Knowing the trick doesn&apos;t make it stop working. But it helps.
              </p>
              <div className="mt-4 text-[10px] font-mono text-gray-400 group-hover:text-[#17c3b2] uppercase tracking-widest">Watch on YouTube →</div>
            </a>

            <a
              href="https://www.reddit.com/r/problemgambling/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-6 border border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 hover:border-orange-500/60 transition-all group block"
            >
              <div className="text-orange-400 font-black uppercase text-xs tracking-widest mb-2">COMMUNITY</div>
              <h3 className="text-lg font-black text-white uppercase mb-2 group-hover:text-orange-400 transition-colors">r/problemgambling</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                700k+ people posting honestly about where they are. No filters. Read a few threads. You are not the only one who has been here tonight.
              </p>
              <div className="mt-4 text-[10px] font-mono text-orange-400 uppercase tracking-widest">Open Reddit →</div>
            </a>

            <div className="p-6 border border-gray-800/60 bg-gray-900/30">
              <div className="text-gray-600 font-black uppercase text-xs tracking-widest mb-2">IRL QUEST</div>
              <h3 className="text-lg font-black text-white uppercase mb-2">Cold Shower</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Two minutes cold at the end. Not a punishment — a reset. Cortisol drops. The urge to reload fades. You come back to baseline faster.
              </p>
              <div className="mt-4 text-[10px] font-mono text-gray-600 uppercase tracking-widest">No link. Turn the dial.</div>
            </div>

            <div className="p-6 border border-gray-800/60 bg-gray-900/30">
              <div className="text-gray-600 font-black uppercase text-xs tracking-widest mb-2">IRL QUEST</div>
              <h3 className="text-lg font-black text-white uppercase mb-2">Write the Number Down</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                What you lost tonight. Total. No rounding. Pen and paper. The brain minimizes in memory. Writing it down stops that. Look at it for 30 seconds.
              </p>
              <div className="mt-4 text-[10px] font-mono text-gray-600 uppercase tracking-widest">No link. Just write it.</div>
            </div>

            <div className="p-6 border border-gray-800/60 bg-gray-900/30">
              <div className="text-gray-600 font-black uppercase text-xs tracking-widest mb-2">IRL QUEST</div>
              <h3 className="text-lg font-black text-white uppercase mb-2">Actually Touch Grass</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Outside. Shoes on. Walk. The urge to reload has a half-life of about 20 minutes. Outlast it.
              </p>
              <div className="mt-4 text-[10px] font-mono text-gray-600 uppercase tracking-widest">No link needed.</div>
            </div>

          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 px-4 border-t border-[#283347] bg-black/60 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-4">
            Right Now
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            Pick one thing. Just one.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <a href="tel:1-800-426-2537" className="btn btn-primary py-3 px-6 font-black text-base sm:flex-1 sm:max-w-xs">
              Call 1-800-GAMBLER
            </a>
            <a href="https://www.ncpg.org/chat" target="_blank" rel="noopener noreferrer" className="btn btn-secondary py-3 px-6 font-black text-base sm:flex-1 sm:max-w-xs">
              Start Chat with NCPG
            </a>
            <Link href="/" className="btn btn-secondary py-3 px-6 font-black text-base sm:flex-1 sm:max-w-xs">
              Go Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
