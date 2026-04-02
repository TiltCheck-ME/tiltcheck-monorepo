/* © 2024–2026 TiltCheck Ecosystem. All rights reserved. */
"use client";

import React from 'react';
import Link from 'next/link';

export default function TouchGrassPage() {
  const [activeTab, setActiveTab] = React.useState<'immediate' | 'resources' | 'support'>('immediate');

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <section className="border-b border-[#ef4444]/30 py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl md:text-7xl font-black uppercase tracking-tighter mb-6 text-[#ef4444]">
            TOUCH GRASS PROTOCOL
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            If you're reading this, you've either hit a limit on TiltCheck, or you know you need one. Either way, we're talking real talk now.
          </p>
        </div>
      </section>

      <section className="py-12 px-4 bg-[#ef4444]/10 border-b border-[#ef4444]/30">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-lg font-bold text-[#ef4444]">
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
                    Close the casino. Close the browser. Put the phone in another room. The urge to "get it back" is your dopamine talking, not your brain. It will lie to you.
                  </p>
                </div>
                <div className="pt-6 border-t border-[#ef4444]/20">
                  <h3 className="text-lg font-black uppercase mb-3 text-[#ef4444]">Step 2: Tell Someone</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Not your buddy who gambles. Your Guardian from TiltCheck. Your parent. Your partner. Someone who will actually care and won't enable you. Shame is a tool. Use it.
                  </p>
                </div>
                <div className="pt-6 border-t border-[#ef4444]/20">
                  <h3 className="text-lg font-black uppercase mb-3 text-[#ef4444]">Step 3: Count What You Lost</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Don't estimate. Write it down. Look at it. The number is real. The loss is real. You can't fix it tonight. You might not be able to fix it alone.
                  </p>
                </div>
                <div className="pt-6 border-t border-[#ef4444]/20">
                  <h3 className="text-lg font-black uppercase mb-3 text-[#ef4444]">Step 4: Seek Help</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Call <strong>1-800-GAMBLER (1-800-426-2537)</strong>. It's free. It's confidential. They won't judge you. They've heard it all.
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

              <div className="p-8 border border-[#ffd700]/30 bg-[#ffd700]/5 space-y-4">
                <h2 className="text-2xl font-black uppercase text-[#ffd700]">Test Yourself Honestly</h2>
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

      {/* Bottom CTA */}
      <section className="py-12 px-4 border-t border-[#283347] bg-black/40 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-black uppercase tracking-tight mb-4">
            Right Now
          </h2>
          <p className="text-gray-400 mb-6">
            Pick one thing. Just one.
          </p>
          <div className="flex flex-col gap-3">
            <a href="tel:1-800-426-2537" className="btn btn-primary py-3 px-6 font-black text-lg">
              Call 1-800-GAMBLER
            </a>
            <a href="https://www.ncpg.org/chat" target="_blank" rel="noopener noreferrer" className="btn btn-secondary py-3 px-6 font-black">
              Start Chat with NCPG
            </a>
            <Link href="/" className="btn btn-secondary py-3 px-6 font-black">
              Go Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
