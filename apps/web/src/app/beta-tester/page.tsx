"use client";

import React, { useState } from 'react';

export default function BetaTesterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/beta/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discord_username: data.get('discord') as string,
          experience_level: data.get('style') as string,
          interests: data.getAll('aspects') as string[],
          referral_source: data.get('setup') as string,
          feedback_preference: data.get('proof') as string,
        }),
      });

      if (!res.ok) throw new Error('Submit failed');
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Try again or hit us up on Discord.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-5xl mx-auto flex flex-col gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="border-b border-[#283347] pb-8 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-[color:var(--color-primary)]">
          Beta Tester Program
          <span className="ml-4 text-sm font-mono font-normal text-[#17c3b2] bg-[#17c3b2]/10 px-2 py-1 rounded">
            TRUST ENGINES
          </span>
        </h1>
        <p className="text-gray-400 mt-4 max-w-3xl">
          We&apos;re looking for enthusiastic users to help us refine and improve the Trust Engines! As a beta tester, you&apos;ll get early access to new features, directly influence development, and earn exclusive rewards.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-8">
          <div className="terminal-box border-[#17c3b2] p-8 bg-black/40">
            <h2 className="text-lg font-black uppercase tracking-widest text-[#17c3b2] mb-6 flex items-center gap-2">
              <span className="w-2 h-2 bg-[#17c3b2] rounded-full animate-pulse"></span>
              Benefits & Rewards
            </h2>
            <ul className="space-y-4 text-sm text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-[#17c3b2] mt-0.5">▹</span>
                <div>
                  <strong className="text-white">Early Access:</strong> Be among the first to experience and test new scoring models, event handlers, and API functionalities before public release.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#17c3b2] mt-0.5">▹</span>
                <div>
                  <strong className="text-white">Direct Impact:</strong> Your feedback will directly shape the future of Trust Engines, helping us build a more accurate and robust system.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#17c3b2] mt-0.5">▹</span>
                <div>
                  <strong className="text-white">Deep Dive:</strong> Gain a deeper understanding of how trust scores are calculated and the underlying mechanics.
                </div>
              </li>
            </ul>

            <div className="mt-8 border-t border-[#283347] pt-6">
              <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 tracking-wider">Exclusive Assurances</h3>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 bg-[#17c3b2]/5 border border-[#17c3b2]/20 text-[#17c3b2]">
                  🏆 Genesis Tester Role (Whitelist)
                </div>
                <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 text-yellow-500">
                  🪙 50% Lifetime Premium Discount
                </div>
                <div className="p-3 bg-blue-500/5 border border-blue-500/20 text-blue-400">
                  ⚡ Free During Beta
                </div>
                <div className="p-3 bg-white/5 border border-white/10 text-white">
                  👑 Immortalized in CREDITS.TXT
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border border-[#17c3b2]/30 bg-[#17c3b2]/5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#17c3b2] mb-3">Jump In</h2>
            <p className="text-xs text-gray-400 font-mono italic mb-4">
              &quot;The math is ready. We just need real people to tell us what&apos;s broken.&quot;
            </p>
            <p className="text-xs text-gray-500 leading-relaxed font-mono mb-6">
              Join the TiltCheck Discord and claim your Genesis role. We need people who actually play to kick the tires before this goes public.
            </p>
            <a 
              href="https://discord.gg/gdBsEJfCar" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-[#17c3b2] text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
            >
              Join Discord
            </a>
          </div>
        </div>

        <div className="terminal-box border-[#283347] bg-black/60 relative overflow-hidden">
          {/* Scanline effect wrapper */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-10 opacity-20"></div>
          
          <div className="p-4 border-b border-[#283347] bg-black/80 flex items-center justify-between z-20 relative">
            <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest">survey.exe</h2>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
              <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
            </div>
          </div>

          <div className="p-8 z-20 relative">
            {submitted ? (
              <div className="text-center py-16 animate-in zoom-in duration-300">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white uppercase tracking-widest mb-2">Got it.</h3>
                <p className="text-gray-400 font-mono text-sm max-w-sm mx-auto">
                  We&apos;ll hit you up on Discord if you&apos;re in. Keep an eye on your DMs.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="form-group">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#17c3b2] mb-2">
                    1. Discord Username
                  </label>
                  <input 
                    name="discord"
                    required
                    placeholder="E.g., YourName or YourName#1234"
                    className="w-full bg-black/50 border border-[#283347] p-3 text-white font-mono text-sm focus:outline-none focus:border-[#17c3b2] transition-colors"
                  />
                </div>

                <div className="form-group">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#17c3b2] mb-3">
                    2. WHAT IS YOUR TESTING STYLE?
                  </label>
                  <div className="flex flex-col gap-2 font-mono text-xs text-gray-300">
                    {[
                      { label: 'The Bug Hunter: I’m great at finding broken links, typos, and layout issues.', val: 'hunter' },
                      { label: 'The Power User: I want to stress-test the math and the "Trust Scores."', val: 'power' },
                      { label: 'The Newbie: I can tell you if the instructions actually make sense to a beginner.', val: 'newbie' }
                    ].map((opt) => (
                      <label key={opt.val} className="flex items-center gap-3 cursor-pointer hover:text-white transition-colors p-3 border border-transparent hover:border-[#283347] bg-black/20">
                        <input type="radio" name="style" required className="accent-[#17c3b2]" value={opt.val} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#17c3b2] mb-3">
                    3. WHAT DO YOU WANT TO TRY FIRST?
                  </label>
                  <div className="flex flex-col gap-2 font-mono text-xs text-gray-300">
                    {[
                      'Trust Engines: Testing how we score player and casino reputations.',
                      'System Stability: Making sure the data stays accurate and the site is fast.',
                      'The Bot: Trying out Discord commands (once the server is live).',
                      'The Docs: Reviewing our guides to make sure they aren\'t "too technical."'
                    ].map((opt) => (
                      <label key={opt} className="flex items-center gap-3 cursor-pointer hover:text-white transition-colors p-3 border border-transparent hover:border-[#283347] bg-black/20">
                        <input type="checkbox" name="aspects" className="accent-[#17c3b2]" value={opt} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#17c3b2] mb-3">
                    4. YOUR SETUP
                  </label>
                  <div className="flex flex-col gap-2 font-mono text-xs text-gray-300">
                    {['Desktop (Chrome/Brave)', 'Desktop (Safari/Firefox)', 'Mobile (iOS/Android)'].map((opt) => (
                      <label key={opt} className="flex items-center gap-3 cursor-pointer hover:text-white transition-colors p-3 border border-transparent hover:border-[#283347] bg-black/20">
                        <input type="radio" name="setup" required className="accent-[#17c3b2]" value={opt} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#17c3b2] mb-2">
                    5. PROOF OF BRAIN
                  </label>
                  <p className="text-[10px] text-gray-500 italic mb-2">In one sentence, what is a &quot;red flag&quot; that makes you stop trusting a crypto project?</p>
                  <textarea 
                    required 
                    className="w-full bg-black/50 border border-[#283347] p-3 text-white font-mono text-sm focus:outline-none focus:border-[#17c3b2] transition-colors resize-none h-20"
                    placeholder="Type your audit signal..."
                  />
                </div>

                <div className="flex flex-col gap-4">
                    {error && <p className="text-red-500 text-xs text-center font-mono">{error}</p>}
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 text-xs font-black uppercase tracking-[0.2em] bg-[#17c3b2]/10 text-[#17c3b2] border border-[#17c3b2]/30 hover:bg-[#17c3b2]/20 hover:shadow-[0_0_20px_rgba(23,195,178,0.2)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Sending...' : 'Send it'}
                  </button>
                  <p className="text-[9px] text-center text-gray-600 font-mono uppercase tracking-tighter">
                    NOTE: Submitting this form does not guarantee entry. Our Trust Engine is already watching. Don&apos;t be a bot.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
