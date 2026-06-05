/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import ToolPageHeader from '@/components/ToolPageHeader';
import { useAuth } from '@/hooks/useAuth';
import { getDiscordLoginApiBase, getDiscordLoginUrl } from '@/lib/discord-login';
import { signInWithMagicEmail } from '@/lib/magicAuth';

type ApplicationPath = 'discord' | 'site';

const TESTER_TYPES = [
  { label: 'Breaker — find edge cases on purpose.', val: 'breaker' },
  { label: 'Validator — play normally, report when it feels off.', val: 'validator' },
  { label: 'Skeptic — push the audit layer until the math checks out.', val: 'skeptic' },
  { label: 'Newbie — tell us if it makes sense to a first-timer.', val: 'newbie' },
];

const TEST_TARGETS = [
  { label: 'Delta Engine — RTP audit vs what the casino runs', val: 'delta' },
  { label: 'Trust scores — grading vs your experience', val: 'trust' },
  { label: 'Extension — install, run quietly, no session breaks', val: 'extension' },
  { label: 'Discord bot — /audit, /rtp, /trust', val: 'bot' },
  { label: 'Phishing Shield — scam domains you actually see', val: 'phishing' },
];

const TEST_SETUP = [
  { label: 'Chrome or Brave — can test extension', val: 'chrome' },
  { label: 'Firefox or Safari — web tools only', val: 'firefox' },
  { label: 'Mobile — web only', val: 'mobile' },
];

export default function BetaTesterPage() {
  const [submittedPath, setSubmittedPath] = useState<ApplicationPath | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [applicationPath, setApplicationPath] = useState<ApplicationPath>('discord');
  const [error, setError] = useState<string | null>(null);
  const [magicEmail, setMagicEmail] = useState('');
  const [magicLoading, setMagicLoading] = useState(false);
  const { user, loading } = useAuth();
  const apiUrl = getDiscordLoginApiBase();
  const hasLinkedDiscord = Boolean(user?.discordId);
  const signedInEmail = user?.email?.trim() || null;

  useEffect(() => {
    if (!loading && !hasLinkedDiscord) {
      setApplicationPath('site');
    }
  }, [hasLinkedDiscord, loading]);

  const laneCopy = useMemo(() => {
    if (applicationPath === 'discord') {
      return {
        title: 'Discord lane',
        summary: 'Best if you want bot commands, founder tester role, and community access on approval.',
      };
    }

    return {
      title: 'Site lane',
      summary: 'Best if you want web tools, dashboard, and extension access without Discord being required.',
    };
  }, [applicationPath]);

  const handleLinkDiscord = () => {
    if (typeof window === 'undefined') {
      return;
    }

    window.location.href = getDiscordLoginUrl(window.location.href);
  };

  const handleMagicSignIn = async () => {
    if (!magicEmail.trim()) {
      setError('Enter your email first.');
      return;
    }

    setMagicLoading(true);
    setError(null);

    try {
      await signInWithMagicEmail(apiUrl, magicEmail.trim());
      window.location.reload();
    } catch (magicError) {
      setError(magicError instanceof Error ? magicError.message : 'Magic sign-in failed.');
    } finally {
      setMagicLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('tc_token') : null;

    try {
      const res = await fetch(`${apiUrl}/beta/signup`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          applicationPath,
          email: applicationPath === 'site' ? signedInEmail || (data.get('email') as string) : undefined,
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

      setSubmittedPath(applicationPath);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong. Try again or hit us up directly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="public-page public-page--tight min-h-screen bg-[#0a0c10] text-white">
      <ToolPageHeader
        eyebrow="Trust engines beta"
        title="Break it before we ship it"
        description="Stress-test trust scoring, Delta Engine, and RTP audit. Discord optional — pick the lane that matches how you play."
        actions={
          <a
            href="https://discord.gg/gdBsEJfCar"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#17c3b2] hover:bg-[#17c3b2]/20"
          >
            Join Discord
          </a>
        }
      />

      <div className="mx-auto max-w-5xl px-4 pb-12 flex flex-col gap-8">
      <section className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-8">
        <div className="rounded-xl border border-[#283347] bg-black/40 p-5 text-sm text-gray-400 space-y-3">
          <p className="text-xs font-black uppercase tracking-wider text-[#17c3b2]">What you get</p>
          <ul className="space-y-2 list-disc list-inside text-gray-300">
            <li>Early builds before public release</li>
            <li>Bug reports go straight to the build</li>
            <li>Full trust-score methodology visibility</li>
          </ul>
          <p className="text-[11px] font-mono text-gray-500 pt-2 border-t border-[#283347]">
            Discord lane = bot + role. Site lane = web, dashboard, extension via email.
          </p>
        </div>

        <div className="rounded-xl border border-[#283347] bg-black/60">
          <div className="px-5 py-3 border-b border-[#283347]">
            <h2 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">Application</h2>
          </div>

          <div className="p-6">
            {submittedPath ? (
              <div className="text-center py-16 animate-in zoom-in duration-300">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white uppercase tracking-widest mb-2">Application received.</h3>
                <p className="text-gray-400 font-mono text-sm max-w-sm mx-auto">
                  {submittedPath === 'discord'
                    ? "We'll review it against your linked Discord account. If approved, Discord-native beta access lands there without the username guessing game."
                    : "We'll review it against the email you submitted. If approved, non-Discord beta access will route through your site and email path."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([
                    {
                      value: 'discord',
                      title: 'Apply with Discord',
                      body: 'Best for bot access, founder role, and server perks.',
                    },
                    {
                      value: 'site',
                      title: 'Apply without Discord',
                      body: 'Best for web, dashboard, and extension access only.',
                    },
                  ] as const).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setApplicationPath(option.value)}
                      className={`text-left p-4 border transition-all ${
                        applicationPath === option.value
                          ? 'border-[#17c3b2] bg-[#17c3b2]/10 text-white'
                          : 'border-[#283347] bg-black/40 text-gray-400 hover:border-[#17c3b2]/30 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-black uppercase tracking-widest mb-2">{option.title}</div>
                      <div className="text-[11px] font-mono leading-relaxed">{option.body}</div>
                    </button>
                  ))}
                </div>

                <div className="border border-[#283347] bg-black/40 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-[#17c3b2] mb-2">{laneCopy.title}</p>
                  <p className="text-[11px] font-mono text-gray-400 leading-relaxed">{laneCopy.summary}</p>
                </div>

                {applicationPath === 'discord' ? (
                  loading ? (
                    <div className="text-center py-10">
                      <p className="text-gray-400 font-mono text-sm">Checking linked Discord session...</p>
                    </div>
                  ) : !hasLinkedDiscord ? (
                    <div className="flex flex-col gap-6">
                      <div className="border border-[#17c3b2]/30 bg-[#17c3b2]/5 p-6">
                        <h3 className="text-lg font-black uppercase tracking-widest text-white mb-3">Link Discord to continue.</h3>
                        <p className="text-sm text-gray-400 font-mono leading-relaxed">
                          Discord applications use your real linked Discord identity. That keeps approvals clean, role grants fast, and stops manual username hunting.
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
                    <>
                      <div className="form-group border border-[#17c3b2]/20 bg-[#17c3b2]/5 p-4">
                        <label className="block text-xs font-bold uppercase tracking-widest text-[#17c3b2] mb-2">
                          Linked Discord
                        </label>
                        <p className="text-sm text-white font-mono">
                          {user?.discordUsername} <span className="text-gray-500">({user?.discordId})</span>
                        </p>
                        <p className="text-[10px] text-gray-600 font-mono mt-1">
                          This is the identity we use for review, DMs, and beta role access.
                        </p>
                      </div>

                      <SharedFields />
                    </>
                  )
                ) : (
                  <>
                    {signedInEmail ? (
                      <div className="form-group border border-[#17c3b2]/20 bg-[#17c3b2]/5 p-4">
                        <label className="block text-xs font-bold uppercase tracking-widest text-[#17c3b2] mb-2">
                          Site account
                        </label>
                        <p className="text-sm text-white font-mono">{signedInEmail}</p>
                        <p className="text-[10px] text-gray-600 font-mono mt-1">
                          We will anchor this beta application to your site account and use email for approval updates.
                        </p>
                      </div>
                    ) : (
                      <div className="border border-[#17c3b2]/20 bg-[#17c3b2]/5 p-5 flex flex-col gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-widest text-[#17c3b2] mb-2">
                            Sign in with Magic email
                          </label>
                          <input
                            type="email"
                            value={magicEmail}
                            onChange={(event) => setMagicEmail(event.target.value)}
                            placeholder="you@example.com"
                            className="w-full bg-black/50 border border-[#283347] p-3 text-white font-mono text-sm focus:outline-none focus:border-[#17c3b2] transition-colors"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={magicLoading}
                          onClick={handleMagicSignIn}
                          className="w-full py-3 text-[11px] font-black uppercase tracking-[0.2em] bg-[#17c3b2]/10 text-[#17c3b2] border border-[#17c3b2]/30 hover:bg-[#17c3b2]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {magicLoading ? 'Sending link...' : 'Sign in with Magic →'}
                        </button>
                        <p className="text-[10px] text-gray-600 font-mono">
                          No Discord required. Magic proves the email, then the beta application locks to your site account instead of a raw inbox string.
                        </p>
                        {error && <p className="text-red-500 text-xs font-mono">{error}</p>}
                      </div>
                    )}

                    {signedInEmail && <SharedFields />}
                  </>
                )}

                {((applicationPath === 'site' && Boolean(signedInEmail)) || (applicationPath === 'discord' && hasLinkedDiscord)) && (
                  <div className="flex flex-col gap-4">
                    {error && <p className="text-red-500 text-xs text-center font-mono">{error}</p>}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-4 text-xs font-black uppercase tracking-[0.2em] bg-[#17c3b2]/10 text-[#17c3b2] border border-[#17c3b2]/30 hover:bg-[#17c3b2]/20 hover:shadow-[0_0_20px_rgba(23,195,178,0.2)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Submitting...' : `Apply via ${applicationPath === 'discord' ? 'Discord' : 'Site'} →`}
                    </button>
                    <p className="text-[9px] text-center text-gray-600 font-mono uppercase tracking-tighter">
                      Submission does not guarantee entry. We review manually. Bots get flagged.
                    </p>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </section>
      </div>
    </main>
  );
}

function SharedFields() {
  return (
    <>
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
          {TESTER_TYPES.map((opt) => (
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
          {TEST_TARGETS.map((opt) => (
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
          {TEST_SETUP.map((opt) => (
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
        <p className="text-[10px] text-gray-500 italic mb-2">One sentence. Be blunt. Wrong answers do not exist but vague ones do.</p>
        <textarea
          name="proof"
          required
          className="w-full bg-black/50 border border-[#283347] p-3 text-white font-mono text-sm focus:outline-none focus:border-[#17c3b2] transition-colors resize-none h-20"
          placeholder="The data has to be..."
        />
      </div>
    </>
  );
}
