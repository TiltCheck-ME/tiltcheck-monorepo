/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-09 */
import React from 'react';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <section className="border-b border-[#283347] py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="neon neon-main text-5xl md:text-7xl mb-6" data-text="BUILT BY A DEGEN">
            BUILT BY A DEGEN
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            For degens. No corporate watering down. No institutional hand-wringing. Just the math and someone who's actually been there at 3am chasing a loss streak.
          </p>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto space-y-16">
          {/* The Problem */}
          <div>
            <h2 className="text-4xl font-black uppercase tracking-tight mb-8 text-[#17c3b2]">
              The Problem (As Seen From Inside)
            </h2>
            <div className="space-y-4 text-gray-400 leading-relaxed">
              <p>
                The house wins because they have three things going for them:
              </p>
              <ol className="space-y-3 ml-6 list-decimal">
                <li><strong>Time.</strong> Casinos are open 24/7. Your brain gets tired. Theirs doesn't.</li>
                <li><strong>Math.</strong> Every game has a built-in edge. Over enough rounds, probability always wins.</li>
                <li><strong>Psychology.</strong> They know your dopamine system better than you do. The lights, the sounds, the near-misses — it's all engineered to keep you playing.</li>
              </ol>
              <p>
                Meanwhile, you've got:
              </p>
              <ol className="space-y-3 ml-6 list-decimal">
                <li><strong>Hope.</strong> "Maybe this hand." "Maybe this spin." It's not a strategy.</li>
                <li><strong>No Data.</strong> You don't know your actual RTP. You don't know if the casino is soft-nerfing payouts. You just have a gut feeling.</li>
                <li><strong>Your Emotions.</strong> Chasing losses is irrational but feels logical at 2am. Revenge betting is stupid but feels righteous.</li>
              </ol>
              <p>
                So you lose. And the cycle repeats.
              </p>
            </div>
          </div>

          {/* The Philosophy */}
          <div>
            <h2 className="text-4xl font-black uppercase tracking-tight mb-8 text-[#17c3b2]">
              The TiltCheck Philosophy
            </h2>
            <div className="space-y-6 text-gray-400 leading-relaxed">
              <div>
                <h3 className="text-lg font-black uppercase mb-2 text-white">We Don't Try to Stop You</h3>
                <p>
                  We're not here to lecture you about gambling being bad. You already know that. You're going to gamble anyway. The question is whether you'll do it with your eyes open or blinded by hope and dopamine.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-black uppercase mb-2 text-white">We Give You Signals, Not Solutions</h3>
                <p>
                  Real-time audit data. RNG verification. Tilt detection. Variance tracking. We show you the math. What you do with it is up to you. But at least you'll know.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-black uppercase mb-2 text-white">We Believe in Accountability, Not Shame</h3>
                <p>
                  When you hit your limits, the system locks. No judgment. No "we told you so." Just a hard stop so you get time to think. Your Guardian gets a ping. Your community knows. That transparency is more powerful than any warning label.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-black uppercase mb-2 text-white">We Play the Long Game</h3>
                <p>
                  Our core philosophy: "Redeem-to-Win." Don't try to turn $10 into $1,000. Turn $10 into $20, cash it out, and live to gamble another day. Winning is easy. Keeping it is legendary.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-black uppercase mb-2 text-white">We Never Touch Your Money</h3>
                <p>
                  Non-custodial. Non-negotiable. Your keys, your wallet, your responsibility. We audit the outcome, not the funds.
                </p>
              </div>
            </div>
          </div>

          {/* The Mission */}
          <div className="p-8 border border-[#17c3b2]/30 bg-[#17c3b2]/5">
            <h2 className="text-2xl font-black uppercase mb-4 text-[#17c3b2]">The Mission</h2>
            <p className="text-gray-400 leading-relaxed text-lg">
              Shift the definition of a "win" from "I didn't lose everything" to "I actually kept the money." Make it profitable to play smart instead of profitable to play long. Give every degen — from casual to hardcore — a fair shot at keeping their bag.
            </p>
          </div>

          {/* Who Built It */}
          <div>
            <h2 className="text-4xl font-black uppercase tracking-tight mb-8">
              Who Built This
            </h2>
            <div className="p-8 border border-[#283347] bg-black/40 space-y-4">
              <div>
                <h3 className="text-lg font-black uppercase text-[#17c3b2]">jmenichole (Founder & Dev)</h3>
                <p className="text-gray-400 text-sm mt-2">
                  Spent years chasing losses. Built software. Realized the software could fix the losses. Now building tools that let you do the same.
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Specialties: fullstack architecture, trust engines, behavioral analysis, and knowing exactly what it feels like to be down bad at 3am.
                </p>
              </div>
              <div className="mt-6 pt-6 border-t border-[#283347]">
                <p className="text-xs text-gray-600 font-mono uppercase tracking-widest">
                  The whole team is degens who've felt the pain. No corporate types. No consultants. Just people who needed this tool to exist.
                </p>
              </div>
            </div>
          </div>

          {/* What's Next */}
          <div>
            <h2 className="text-4xl font-black uppercase tracking-tight mb-8">
              What's Next
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 border border-[#283347] bg-black/40">
                <h3 className="font-black uppercase mb-3 text-[#17c3b2]">Short Term (Next 3 months)</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Mobile extension version</li>
                  <li>• Enhanced tilt detection AI</li>
                  <li>• Casino fairness lawsuit tracking</li>
                  <li>• Guardian SMS alerts</li>
                </ul>
              </div>
              <div className="p-6 border border-[#283347] bg-black/40">
                <h3 className="font-black uppercase mb-3 text-[#17c3b2]">Long Term (6+ months)</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• RGaaS API (let other platforms use our trust engines)</li>
                  <li>• Multiplayer accountability (squad mode)</li>
                  <li>• Live tournament mode (prove your skill)</li>
                  <li>• Insurance pool (community-funded safety net)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final Message */}
      <section className="py-20 px-4 border-t border-[#283347] bg-black/40 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black uppercase tracking-tight mb-6">
            One More Thing
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed mb-8">
            This tool exists because I needed it. Not because I think gambling is "bad." Because I know it's real, it's profitable if you're smart, and it's catastrophic if you're not. TiltCheck is for people who want to be smart about it.
          </p>
          <p className="text-gray-400 text-lg leading-relaxed">
            If you're actually in crisis — if you've lost money you can't afford to lose — this tool isn't enough. Reach out to <a href="https://www.ncpg.org" target="_blank" rel="noopener noreferrer" className="text-[#17c3b2] underline hover:no-underline">NCPG.org</a> or call 1-800-GAMBLER. Real help exists.
          </p>
          <p className="text-gray-400 text-lg leading-relaxed mt-6 italic">
            For everyone else: let's tip the scale back.
          </p>
        </div>
      </section>
    </main>
  );
}
