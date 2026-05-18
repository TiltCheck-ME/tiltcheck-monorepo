/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-18 */
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding, submitOnboarding } from '@/hooks/useOnboarding';
import { getDashboardHandoffUrl, getDashboardLaneLabel } from '@/lib/dashboard-handoff';

type Step = 'connect' | 'extension' | 'vault' | 'complete';

const STEP_ORDER: Step[] = ['connect', 'extension', 'vault', 'complete'];

const STEP_LABELS: Record<Step, string> = {
  connect: 'Connect',
  extension: 'Extension',
  vault: 'Vault lock',
  complete: 'Done',
};

const DEFAULT_ONBOARDING_PAYLOAD = {
  riskLevel: 'moderate' as const,
  hasAcceptedTerms: true,
  quizScores: {} as Record<string, number>,
  preferences: {
    cooldownEnabled: true,
    notifications: { tips: true, trivia: true, promos: false },
  },
};

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const { status, loading: onboardLoading } = useOnboarding();
  const [step, setStep] = useState<Step>('connect');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extensionOpened, setExtensionOpened] = useState(false);

  const dashboardVaultUrl = useMemo(() => getDashboardHandoffUrl('/dashboard?tab=vault'), []);
  const vaultLaneLabel = useMemo(() => getDashboardLaneLabel('/dashboard?tab=vault'), []);

  useEffect(() => {
    if (!onboardLoading && status.isOnboarded) {
      setStep('complete');
    }
  }, [onboardLoading, status.isOnboarded]);

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

  async function handleAcceptConnect() {
    setSaving(true);
    setError(null);
    try {
      await submitOnboarding({ step: 'terms', ...DEFAULT_ONBOARDING_PAYLOAD });
      goNext();
    } catch {
      setError('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleExtensionContinue() {
    setSaving(true);
    setError(null);
    try {
      await submitOnboarding({ step: 'preferences', ...DEFAULT_ONBOARDING_PAYLOAD });
      goNext();
    } catch {
      setError('Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleFinishOnboarding() {
    setSaving(true);
    setError(null);
    try {
      await submitOnboarding({ step: 'completed', ...DEFAULT_ONBOARDING_PAYLOAD });
      setStep('complete');
    } catch {
      setError('Failed to complete setup. Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || onboardLoading) {
    return (
      <main className="min-h-screen bg-[#0a0c10] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#17c3b2] animate-pulse">Loading</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0c10] text-white px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#17c3b2] mb-4">
            Launch setup — Step {currentStepIndex + 1} of {STEP_ORDER.length}
          </p>
          <div className="flex gap-2">
            {STEP_ORDER.map((s, i) => (
              <div key={s} className="flex-1 flex flex-col gap-1">
                <div
                  className="h-1 transition-all duration-500"
                  style={{
                    backgroundColor: i <= currentStepIndex ? '#17c3b2' : 'rgba(255,255,255,0.08)',
                    boxShadow: i <= currentStepIndex ? '0 0 8px rgba(23,195,178,0.4)' : 'none',
                  }}
                />
                <span
                  className="text-[9px] font-black uppercase tracking-[0.2em]"
                  style={{ color: i <= currentStepIndex ? '#17c3b2' : '#4b5563' }}
                >
                  {STEP_LABELS[s]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 px-4 py-3">
            <p className="text-xs font-mono text-[#ef4444]">{error}</p>
          </div>
        )}

        {step === 'connect' && (
          <section>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-4">
              Step 1 — You are connected
            </h1>
            <p className="text-sm text-gray-400 leading-relaxed mb-8">
              Discord is linked. No cap, that is the hard part. Next we arm the extension and your vault
              lock on the dashboard — three steps, then you play with guardrails.
            </p>

            <div className="rounded-2xl border border-[#283347] bg-black/40 p-6 mb-6 space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-2">What you get</p>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>Chrome extension: session pause and tilt signals on supported sites</li>
                  <li>Dashboard vault lock: timer or policy you set before you degen</li>
                  <li>Discord bot: handoffs and community guardrails</li>
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-2">Custody truth</p>
                <p className="text-sm text-gray-300">
                  Direct tips: you sign. Credits use a pooled relay.{' '}
                  <Link href="/legal" className="text-[#17c3b2] hover:underline">
                    Legal + custody matrix
                  </Link>
                  .
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAcceptConnect}
              disabled={saving}
              className="w-full rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] transition-all hover:bg-[#17c3b2]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Accept terms and continue'}
            </button>

            <p className="mt-4 text-center text-[10px] font-mono text-gray-500">
              <Link href="/terms" className="text-[#17c3b2] hover:underline">Terms</Link>
              {' · '}
              <Link href="/privacy" className="text-[#17c3b2] hover:underline">Privacy</Link>
            </p>
          </section>
        )}

        {step === 'extension' && (
          <section>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">
              Step 2 — Install the extension
            </h1>
            <p className="text-sm text-gray-400 leading-relaxed mb-8">
              This is the guardrail that runs while you play. Read-only on supported casino tabs — no wallet
              access, no keys.
            </p>

            <div className="rounded-2xl border border-[#283347] bg-black/40 p-6 mb-6">
              <ol className="space-y-3 text-sm text-gray-300 list-decimal list-inside">
                <li>Open the extension page and install for Chrome</li>
                <li>Click the TiltCheck icon and sign in with the same Discord account</li>
                <li>Enable session pause when the heater starts feeling like tilt</li>
              </ol>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/extension"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setExtensionOpened(true)}
                className="w-full text-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] transition-all hover:bg-[#17c3b2]/20"
              >
                Install extension
              </Link>
              <button
                type="button"
                onClick={handleExtensionContinue}
                disabled={saving}
                className="w-full rounded-xl border border-[#283347] bg-black/30 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 transition-all hover:border-[#17c3b2]/30 hover:text-white disabled:opacity-50"
              >
                {saving ? 'Saving...' : extensionOpened ? 'Continue to vault lock' : 'Continue (install when ready)'}
              </button>
            </div>
          </section>
        )}

        {step === 'vault' && (
          <section>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">
              Step 3 — Set your vault lock
            </h1>
            <p className="text-sm text-gray-400 leading-relaxed mb-8">
              Durable rules live on the dashboard. Fee breakdown shows before you commit if paid early exit
              is allowed. Big yikes if you skip this and degen your whole stack anyway.
            </p>

            <div className="rounded-2xl border border-[#17c3b2]/20 bg-[#17c3b2]/5 p-6 mb-6">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500 mb-2">
                {vaultLaneLabel}
              </p>
              <p className="text-sm text-gray-300 mb-4">
                Open vault controls in a new tab, set a lock duration, then finish setup here.
              </p>
              <a
                href={dashboardVaultUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full text-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] transition-all hover:bg-[#17c3b2]/20"
              >
                Open vault on dashboard
              </a>
            </div>

            <button
              type="button"
              onClick={handleFinishOnboarding}
              disabled={saving}
              className="w-full rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] transition-all hover:bg-[#17c3b2]/20 disabled:opacity-50"
            >
              {saving ? 'Finishing...' : 'Vault set — finish setup'}
            </button>
          </section>
        )}

        {step === 'complete' && (
          <section className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#17c3b2] mb-4">
              You are live
            </p>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-4">
              Guardrails armed
            </h1>
            <p className="text-sm text-gray-400 leading-relaxed max-w-lg mx-auto mb-8">
              Extension for in-session signals. Dashboard for vault and buddies. Discord when you need the
              squad.
            </p>

            <div className="flex flex-col gap-3 max-w-sm mx-auto">
              <Link
                href="/extension"
                className="w-full text-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] transition-all hover:bg-[#17c3b2]/20"
              >
                Extension page
              </Link>
              <a
                href={dashboardVaultUrl}
                className="w-full text-center rounded-xl border border-[#283347] px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-gray-300 transition-all hover:border-[#17c3b2]/30 hover:text-white"
              >
                Dashboard vault
              </a>
              <Link
                href="/"
                className="w-full text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-[#17c3b2]"
              >
                Back to home
              </Link>
            </div>

            <p className="mt-8 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
              Made for Degens. By Degens.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
