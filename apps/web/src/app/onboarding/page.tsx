/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding, submitOnboarding } from '@/hooks/useOnboarding';
import { getDashboardHandoffUrl } from '@/lib/dashboard-handoff';

// ── Risk Quiz (mirrors packages/utils/src/onboarding.ts) ───────────────────

interface QuizOption {
  label: string;
  value: string;
  riskWeight: number;
}

interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'delusion_check',
    text: "Okay, hotshot. You're actually up 20%. What's the genius move?",
    options: [
      { label: "I'm out. A win is a win.", value: 'secure', riskWeight: -1 },
      { label: 'Set a stop-loss at my entry. Playing with house money now.', value: 'protect', riskWeight: -0.5 },
      { label: "It's called a 'hot streak' for a reason. Let it ride.", value: 'streak', riskWeight: 0.5 },
      { label: "Double the bet. Scared money don't make money.", value: 'press', riskWeight: 1 },
    ],
  },
  {
    id: 'whats_your_damage',
    text: "Let's be honest, what's your usual 'strategy'?",
    options: [
      { label: "I'm a boring RTP nerd. I only play if the math is right.", value: 'analytical', riskWeight: -0.5 },
      { label: "I'm just here for a good time, but leaving with their money is better.", value: 'casual_profit', riskWeight: 0 },
      { label: 'I chase bonus buys and hunt for those 1000x screen-caps.', value: 'thrill_seeker', riskWeight: 1 },
    ],
  },
  {
    id: 'the_leash',
    text: 'This thing has a leash. How tight do you want it?',
    options: [
      { label: 'If I\'m tilting, lock me out. Save me from myself.', value: 'strict', riskWeight: -1 },
      { label: "Flash a warning. I'll probably ignore it, but at least I saw it.", value: 'nudge', riskWeight: 0.5 },
      { label: "No leash. I'm an adult. (Narrator: He was not.)", value: 'manual', riskWeight: 1 },
    ],
  },
];

function calculateSuggestedRisk(scores: Record<string, number>): 'conservative' | 'moderate' | 'degen' {
  const values = Object.values(scores);
  if (values.length === 0) return 'moderate';
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  if (avg <= -0.5) return 'conservative';
  if (avg >= 0.5) return 'degen';
  return 'moderate';
}

// ── Step Types ──────────────────────────────────────────────────────────────

type Step = 'terms' | 'quiz' | 'preferences' | 'extension' | 'complete';

const STEP_ORDER: Step[] = ['terms', 'quiz', 'preferences', 'extension', 'complete'];

const STEP_LABELS: Record<Step, string> = {
  terms: 'Terms',
  quiz: 'Risk Quiz',
  preferences: 'Preferences',
  extension: 'Extension',
  complete: 'Done',
};

const RISK_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  conservative: {
    label: 'CONSERVATIVE',
    color: '#17c3b2',
    description: 'Hard guardrails. Auto-cooldown on. TiltCheck will step in before you spiral.',
  },
  moderate: {
    label: 'MODERATE',
    color: '#fbbf24',
    description: 'Standard guardrails. Warnings fire, nudges happen, you make the final call.',
  },
  degen: {
    label: 'DEGEN',
    color: '#ef4444',
    description: 'Minimal guardrails. You see the data. You decide. No hand-holding.',
  },
};

// ── Onboarding Page ─────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const { status, loading: onboardLoading } = useOnboarding();
  const [step, setStep] = useState<Step>('terms');
  const [quizStep, setQuizStep] = useState(0);
  const [quizScores, setQuizScores] = useState<Record<string, number>>({});
  const [riskLevel, setRiskLevel] = useState<string>('moderate');
  const [notifications, setNotifications] = useState({ tips: true, trivia: true, promos: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dashboardUrl = useMemo(() => getDashboardHandoffUrl('/dashboard'), []);

  // If already onboarded, skip to complete
  useEffect(() => {
    if (!onboardLoading && status.isOnboarded) {
      setStep('complete');
    }
  }, [onboardLoading, status.isOnboarded]);

  // Redirect unauthenticated
  useEffect(() => {
    if (!authLoading && !user?.userId) {
      window.location.assign('/login?redirect=/onboarding');
    }
  }, [authLoading, user]);

  const currentStepIndex = STEP_ORDER.indexOf(step);

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEP_ORDER.length) {
      setStep(STEP_ORDER[nextIndex]);
    }
  }, [currentStepIndex]);

  // ── Step: Terms ───────────────────────────────────────────────────────────

  async function handleAcceptTerms() {
    setSaving(true);
    setError(null);
    try {
      await submitOnboarding({ step: 'terms', hasAcceptedTerms: true });
      goNext();
    } catch {
      setError('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Step: Quiz ────────────────────────────────────────────────────────────

  function handleQuizAnswer(questionId: string, riskWeight: number) {
    const updated = { ...quizScores, [questionId]: riskWeight };
    setQuizScores(updated);

    if (quizStep < QUIZ_QUESTIONS.length - 1) {
      setQuizStep(quizStep + 1);
    } else {
      const suggested = calculateSuggestedRisk(updated);
      setRiskLevel(suggested);
      goNext();
    }
  }

  // ── Step: Preferences ─────────────────────────────────────────────────────

  async function handleSavePreferences() {
    setSaving(true);
    setError(null);
    try {
      await submitOnboarding({
        step: 'preferences',
        riskLevel,
        quizScores,
        hasAcceptedTerms: true,
        preferences: {
          cooldownEnabled: riskLevel !== 'degen',
          notifications,
        },
      });
      goNext();
    } catch {
      setError('Failed to save preferences. Try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Step: Extension ───────────────────────────────────────────────────────

  async function handleFinishOnboarding() {
    setSaving(true);
    setError(null);
    try {
      await submitOnboarding({
        step: 'completed',
        riskLevel,
        hasAcceptedTerms: true,
        quizScores,
        preferences: {
          cooldownEnabled: riskLevel !== 'degen',
          notifications,
        },
      });
      setStep('complete');
    } catch {
      setError('Failed to complete onboarding. Try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Loading State ─────────────────────────────────────────────────────────

  if (authLoading || onboardLoading) {
    return (
      <main className="min-h-screen bg-[#0a0c10] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#17c3b2] animate-pulse">Loading</p>
        </div>
      </main>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white px-4 py-12">
      <div className="mx-auto max-w-xl">
        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#17c3b2] mb-3">
            Setup · {currentStepIndex + 1}/{STEP_ORDER.length} — {STEP_LABELS[step]}
          </p>
          <div className="flex gap-1">
            {STEP_ORDER.map((s, i) => (
              <div
                key={s}
                className="h-1 flex-1 transition-all duration-300"
                style={{
                  backgroundColor: i <= currentStepIndex ? '#17c3b2' : 'rgba(255,255,255,0.08)',
                }}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 px-4 py-3">
            <p className="text-xs font-mono text-[#ef4444]">{error}</p>
          </div>
        )}

        {/* ── TERMS ──────────────────────────────────────────────────────── */}
        {step === 'terms' && (
          <section>
            <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Ground rules</h1>
            <p className="text-sm text-gray-400 mb-6">
              Read-only audit layer. Not a casino, bank, or financial advice.
            </p>

            <details className="rounded-xl border border-[#283347] bg-black/40 mb-6 group">
              <summary className="cursor-pointer list-none px-5 py-4 text-sm font-black uppercase tracking-wide text-white">
                What TiltCheck is and is not
              </summary>
              <div className="border-t border-[#283347] px-5 py-4 space-y-3 text-sm text-gray-300">
                <p>Session audit, tilt detection, casino trust scoring. Read-only — no wallet custody.</p>
                <p>
                  Tips: direct SOL is non-custodial; credits use pooled relay.{' '}
                  <a
                    href="https://github.com/TiltCheck-ME/tiltcheck-monorepo/blob/main/docs/legal/custody-matrix.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#17c3b2] hover:underline"
                  >
                    Custody matrix
                  </a>
                  .
                </p>
                <p>
                  Problem gambling:{' '}
                  <a href="https://www.ncpg.org" target="_blank" rel="noopener noreferrer" className="text-[#17c3b2] hover:underline">
                    NCPG.org
                  </a>{' '}
                  · <strong className="text-white">1-800-GAMBLER</strong>
                </p>
              </div>
            </details>

            <button
              type="button"
              onClick={handleAcceptTerms}
              disabled={saving}
              className="w-full rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] transition-all hover:bg-[#17c3b2]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'I understand. Continue.'}
            </button>

            <p className="mt-4 text-center text-[10px] font-mono text-gray-500">
              By continuing you accept the{' '}
              <Link href="/terms" className="text-[#17c3b2] hover:underline">Terms</Link> and{' '}
              <Link href="/privacy" className="text-[#17c3b2] hover:underline">Privacy Policy</Link>.
            </p>
          </section>
        )}

        {/* ── QUIZ ───────────────────────────────────────────────────────── */}
        {step === 'quiz' && (
          <section>
            <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Risk quiz</h1>
            <p className="text-sm text-gray-400 mb-6">Three questions. Sets default guardrail intensity.</p>

            <div className="mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-1">
                Question {quizStep + 1} of {QUIZ_QUESTIONS.length}
              </p>
              <div className="flex gap-1">
                {QUIZ_QUESTIONS.map((_, i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 transition-all duration-300"
                    style={{
                      backgroundColor: i <= quizStep ? '#17c3b2' : 'rgba(255,255,255,0.08)',
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#283347] bg-black/40 p-6 mb-6">
              <h2 className="text-xl font-black text-white mb-6">
                {QUIZ_QUESTIONS[quizStep].text}
              </h2>

              <div className="space-y-3">
                {QUIZ_QUESTIONS[quizStep].options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleQuizAnswer(QUIZ_QUESTIONS[quizStep].id, opt.riskWeight)}
                    className="w-full text-left rounded-xl border border-[#283347] bg-black/30 px-5 py-4 text-sm text-gray-300 transition-all hover:border-[#17c3b2]/40 hover:text-white hover:bg-[#17c3b2]/5"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── PREFERENCES ────────────────────────────────────────────────── */}
        {step === 'preferences' && (
          <section>
            <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Your profile</h1>
            <p className="text-sm text-gray-400 mb-6">Suggested from your answers — change anytime.</p>

            {/* Risk level result */}
            <div className="rounded-2xl border border-[#283347] bg-black/40 p-6 mb-6">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-3">
                Suggested risk profile
              </p>
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="text-2xl font-black uppercase"
                  style={{ color: RISK_CONFIG[riskLevel]?.color }}
                >
                  {RISK_CONFIG[riskLevel]?.label}
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-5">{RISK_CONFIG[riskLevel]?.description}</p>

              <div className="flex flex-wrap gap-2">
                {(['conservative', 'moderate', 'degen'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setRiskLevel(level)}
                    className="rounded-xl border px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                    style={{
                      borderColor: riskLevel === level ? RISK_CONFIG[level].color : '#283347',
                      color: riskLevel === level ? RISK_CONFIG[level].color : '#9ca3af',
                      backgroundColor: riskLevel === level ? `${RISK_CONFIG[level].color}15` : 'transparent',
                    }}
                  >
                    {RISK_CONFIG[level].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notification preferences */}
            <div className="rounded-2xl border border-[#283347] bg-black/40 p-6 mb-6">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-4">
                Notifications
              </p>
              <div className="space-y-3">
                {([
                  { key: 'tips' as const, label: 'Tip notifications', description: 'When someone tips you SOL' },
                  { key: 'trivia' as const, label: 'Trivia alerts', description: 'When Live Trivia games start' },
                  { key: 'promos' as const, label: 'Promo updates', description: 'Bonus drops and platform news' },
                ]).map(({ key, label, description }) => (
                  <label
                    key={key}
                    className="flex items-center justify-between rounded-xl border border-[#283347] bg-black/30 px-4 py-3 cursor-pointer transition-all hover:border-[#17c3b2]/30"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{label}</p>
                      <p className="text-[11px] text-gray-500">{description}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifications[key]}
                      onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                      className="h-4 w-4 accent-[#17c3b2]"
                    />
                  </label>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSavePreferences}
              disabled={saving}
              className="w-full rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] transition-all hover:bg-[#17c3b2]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save and continue'}
            </button>
          </section>
        )}

        {/* ── EXTENSION ──────────────────────────────────────────────────── */}
        {step === 'extension' && (
          <section>
            <h1 className="text-2xl font-black uppercase tracking-tight mb-2">Extension</h1>
            <p className="text-sm text-gray-400 mb-6">
              Optional but recommended — watches live sessions, read-only, links via Discord login.
            </p>

            <div className="rounded-xl border border-[#283347] bg-black/40 p-5 mb-6 text-sm text-gray-300">
              <p>Install from /extension → log in in the sidebar → session data flows to your profile. No wallet access.</p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/extension"
                className="w-full text-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] transition-all hover:bg-[#17c3b2]/20"
              >
                Get the extension
              </Link>
              <button
                type="button"
                onClick={handleFinishOnboarding}
                disabled={saving}
                className="w-full rounded-xl border border-[#283347] bg-black/30 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 transition-all hover:border-[#17c3b2]/30 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Finishing...' : 'Skip for now and finish setup'}
              </button>
            </div>
          </section>
        )}

        {/* ── COMPLETE ───────────────────────────────────────────────────── */}
        {step === 'complete' && (
          <section className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#17c3b2] mb-3">Done</p>
            <h1 className="text-2xl font-black uppercase tracking-tight mb-3">You are in.</h1>
            <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
              Guardrails set. Dashboard has session data, buddies, and vault rules.
            </p>

            <div className="rounded-2xl border border-[#17c3b2]/20 bg-[#17c3b2]/5 p-6 mb-6 inline-block">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-2">
                Your risk profile
              </p>
              <p
                className="text-xl font-black uppercase"
                style={{ color: RISK_CONFIG[riskLevel]?.color ?? '#fbbf24' }}
              >
                {RISK_CONFIG[riskLevel]?.label ?? 'MODERATE'}
              </p>
            </div>

            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              <a
                href={dashboardUrl}
                className="w-full text-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] transition-all hover:bg-[#17c3b2]/20"
              >
                Open dashboard
              </a>
              <Link
                href="/"
                className="w-full text-center rounded-xl border border-[#283347] px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 transition-all hover:border-[#17c3b2]/30 hover:text-white"
              >
                Back to home
              </Link>
            </div>

            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
              Made for Degens. By Degens.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
