/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-13 */
"use client";

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function BetaTesterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, loading } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

  const handleLinkDiscord = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const redirect = encodeURIComponent(window.location.href);
    window.location.href = `${apiUrl}/auth/discord/login?redirect=${redirect}`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch(`${apiUrl}/beta/signup`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          casinos: data.get('casinos') as string,
          style: data.get('style') as string,
          aspects: data.getAll('aspects') as string[],
          setup: data.get('setup') as string,
          proof: data.get('proof') as string,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Submit failed');
      }
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong. Try again or hit us up on Discord.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 max-w-5xl mx-auto flex flex-col gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="border-b border-[#283347] pb-8 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-[color:var(--color-primary)]">
          BREAK IT BEFORE WE SHIP IT
          <span className="ml-4 text-sm font-mono font-normal text-[#17c3b2] bg-[#17c3b2]/10 px-2 py-1 rounded">
            TRUST ENGINES BETA
          </span>
        </h1>
        <p className="text-gray-400 mt-4 max-w-3xl">
          We need real players to stress-test the Trust Engines, Delta Engine, and RTP audit layer before this goes public. Your session data shapes what ships. If it&apos;s broken, you&apos;ll find it first.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-8">
          <div className="terminal-box border-[#17c3b2] p-8 bg-black/40">
            <h2 className="text-2xl font-black uppercase tracking-tight text-[#17c3b2] mb-6 flex items-center gap-2">
              <span className="w-2 h-2 bg-[#17c3b2] rounded-full animate-pulse"></span>
              What You Get
            </h2>
            <ul className="space-y-4 text-sm text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-[#17c3b2] mt-0.5">▹</span>
                <div>
                  <strong className="text-white">First Access:</strong> New Trust Engine builds, Delta Engine updates, and RTP audit features before anyone else sees them.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#17c3b2] mt-0.5">▹</span>
                <div>
                  <strong className="text-white">Direct Line:</strong> Bug reports go straight to the build. No ticket queue, no support bot. You break it, we fix it — and we tell you when it&apos;s fixed.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#17c3b2] mt-0.5">▹</span>
                <div>
                  <strong className="text-white">Know the Math:</strong> Full access to how the Trust Engine scores casinos — including the Greed Premium data most platforms hide from you.
                </div>
              </li>
            </ul>

            <div className="mt-8 border-t border-[#283347] pt-6">
              <h3 className="text-xs font-bold uppercase text-gray-400 mb-4 tracking-wider">Founder Perks</h3>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 bg-[#17c3b2]/5 border border-[#17c3b2]/20 text-[#17c3b2]">
                  [WHITELIST] Founder Tester Role
                </div>
                <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 text-yellow-500">
                  [DISCOUNT] 50% Lifetime Premium
                </div>
                <div className="p-3 bg-blue-500/5 border border-blue-500/20 text-blue-400">
                  [FREE] Full Access During Beta
                </div>
                <div className="p-3 bg-white/5 border border-white/10 text-white">
                  [PERMANENT] Listed in CREDITS.TXT
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border border-[#17c3b2]/30 bg-[#17c3b2]/5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#17c3b2] mb-3">Best Flow</h2>
            <p className="text-xs text-gray-500 leading-relaxed font-mono mb-6">
              Join Discord first. The welcome DM points you to link your account on-site. Once linked, this beta form locks to your real Discord identity so approvals and role grants don&apos;t turn into username roulette.
            </p>
            <a
              href="https://discord.gg/gdBsEJfCar"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-[#17c3b2] text-black text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
            >
              Join Discord →
            </a>
          </div>
        </div>

        <div className="terminal-box border-[#283347] bg-black/60 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-10 opacity-20"></div>

          <div className="p-4 border-b border-[#283347] bg-black/80 flex items-center justify-between z-20 relative">
              <h2 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest">beta_application.exe</h2>
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
                 <h3 className="text-xl font-bold text-white uppercase tracking-widest mb-2">Application received.</h3>
                 <p className="text-gray-400 font-mono text-sm max-w-sm mx-auto">
                   We&apos;ll review it against your linked Discord account. If approved, beta access lands in Discord without the username guessing game.
                 </p>
                </div>
              ) : loading ? (
                <div className="text-center py-16">
                  <p className="text-gray-400 font-mono text-sm">Checking linked Discord session...</p>
                </div>
              ) : !user?.discordId ? (
                <div className="flex flex-col gap-6">
                  <div className="border border-[#17c3b2]/30 bg-[#17c3b2]/5 p-6">
                    <h3 className="text-lg font-black uppercase tracking-widest text-white mb-3">Link Discord to continue.</h3>
                    <p className="text-sm text-gray-400 font-mono leading-relaxed">
                      Beta applications now use your real linked Discord identity. That keeps approvals clean, role grants fast, and stops manual username hunting.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLinkDiscord}
                    className="w-full py-4 text-xs font-black uppercase tracking-[0.2em] bg-[#17c3b2]/10 text-[#17c3b2] border border-[#17c3b2]/30 hover:bg-[#17c3b2]/20 hover:shadow-[0_0_20px_rgba(23,195,178,0.2)] hover:scale-[1.02] transition-all"
                  >
                    Link Discord and Continue →
                  </button>
                  <p className="text-[10px] text-center text-gray-600 font-mono">
                    Join the TiltCheck server first, then come back here after Discord connect finishes.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                  <div className="form-group border border-[#17c3b2]/20 bg-[#17c3b2]/5 p-4">
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#17c3b2] mb-2">
                      Linked Discord
                    </label>
                    <p className="text-sm text-white font-mono">
                      {user.discordUsername} <span className="text-gray-500">({user.discordId})</span>
                    </p>
                    <p className="text-[10px] text-gray-600 font-mono mt-1">
                      This is the identity we use for review, DMs, and beta role access.
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#17c3b2] mb-2">
                      1. Where do you play?
                    </label>
                    <input
                      name="casinos"
                    required
                    placeholder="E.g., Stake, Roobet, McLuck, Pulsz, BetOnline..."
                    className="w-full bg-black/50 border border-[#283347] p-3 text-white font-mono text-sm focus:outline-none focus:border-[#17c3b2] transition-colors"
                  />
                  <p className="text-[10px] text-gray-600 font-mono mt-1">We test against real platforms. Your answer helps us prioritize which ones.</p>
                </div>

                  <div className="form-group">
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#17c3b2] mb-3">
                      2. What kind of tester are you?
                    </label>
                  <div className="flex flex-col gap-2 font-mono text-xs text-gray-300">
                    {[
                      { label: 'Breaker — I will find the edge cases and break things intentionally.', val: 'breaker' },
                      { label: 'Validator — I play normally and report when something feels off.', val: 'validator' },
                      { label: 'Skeptic — I don\'t trust anything until the math checks out. I\'ll push the audit layer hard.', val: 'skeptic' },
                      { label: 'New to this — I\'ll tell you if it makes sense to someone who\'s never heard of an RTP.', val: 'newbie' },
                    ].map((opt) => (
                      <label key={opt.val} className="flex items-start gap-3 cursor-pointer hover:text-white transition-colors p-3 border border-transparent hover:border-[#283347] bg-black/20">
                        <input type="radio" name="style" required className="accent-[#17c3b2] mt-0.5 shrink-0" value={opt.val} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                  <div className="form-group">
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#17c3b2] mb-3">
                      3. What do you want to test first? (pick all that apply)
                    </label>
                  <div className="flex flex-col gap-2 font-mono text-xs text-gray-300">
                    {[
                      { label: 'Delta Engine — does the RTP audit catch what the casino is actually running?', val: 'delta' },
                      { label: 'Trust Scores — does the casino grading feel accurate to my experience?', val: 'trust' },
                      { label: 'Extension — does it install cleanly, run quietly, and not break my session?', val: 'extension' },
                      { label: 'Discord Bot — /audit, /rtp, /trust commands via the bot.', val: 'bot' },
                      { label: 'Phishing Shield — does it catch the scam domains I actually see?', val: 'phishing' },
                    ].map((opt) => (
                      <label key={opt.val} className="flex items-start gap-3 cursor-pointer hover:text-white transition-colors p-3 border border-transparent hover:border-[#283347] bg-black/20">
                        <input type="checkbox" name="aspects" className="accent-[#17c3b2] mt-0.5 shrink-0" value={opt.val} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                  <div className="form-group">
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#17c3b2] mb-2">
                      4. Your setup
                    </label>
                  <div className="flex flex-col gap-2 font-mono text-xs text-gray-300">
                    {[
                      { label: 'Chrome or Brave (Desktop) — can test the extension', val: 'chrome' },
                      { label: 'Firefox or Safari (Desktop) — extension won\'t work, web tools only', val: 'firefox' },
                      { label: 'Mobile (iOS or Android) — mobile web only', val: 'mobile' },
                    ].map((opt) => (
                      <label key={opt.val} className="flex items-start gap-3 cursor-pointer hover:text-white transition-colors p-3 border border-transparent hover:border-[#283347] bg-black/20">
                        <input type="radio" name="setup" required className="accent-[#17c3b2] mt-0.5 shrink-0" value={opt.val} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                  <div className="form-group">
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#17c3b2] mb-2">
                      5. Last question — what would make you actually trust a casino audit tool?
                    </label>
                  <p className="text-[10px] text-gray-500 italic mb-2">One sentence. Be blunt. Wrong answers don&apos;t exist but vague ones do.</p>
                  <textarea
                    name="proof"
                    required
                    className="w-full bg-black/50 border border-[#283347] p-3 text-white font-mono text-sm focus:outline-none focus:border-[#17c3b2] transition-colors resize-none h-20"
                    placeholder="The data has to be..."
                  />
                </div>

                <div className="flex flex-col gap-4">
                  {error && <p className="text-red-500 text-xs text-center font-mono">{error}</p>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 text-xs font-black uppercase tracking-[0.2em] bg-[#17c3b2]/10 text-[#17c3b2] border border-[#17c3b2]/30 hover:bg-[#17c3b2]/20 hover:shadow-[0_0_20px_rgba(23,195,178,0.2)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Apply for Beta Access →'}
                  </button>
                  <p className="text-[9px] text-center text-gray-600 font-mono uppercase tracking-tighter">
                    Submission does not guarantee entry. We review manually. Bots get flagged.
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

