// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19
'use client';

import React from 'react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardHandoffUrl, getWebLoginRedirect } from '@/lib/dashboard-handoff';

export default function BuddySystemPage() {
  const { user, loading } = useAuth();
  const buddiesLaneUrl = getDashboardHandoffUrl('/tools/buddy-system');
  const safetyLaneUrl = getDashboardHandoffUrl('/dashboard?tab=safety');
  const primaryActionHref = !loading && user ? buddiesLaneUrl : getWebLoginRedirect('/tools/buddy-system');

  React.useEffect(() => {
    if (loading || !user) {
      return;
    }

    const redirectTimer = window.setTimeout(() => {
      window.location.assign(buddiesLaneUrl);
    }, 1400);

    return () => window.clearTimeout(redirectTimer);
  }, [buddiesLaneUrl, loading, user]);

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-[#0a0c10] text-white">
        <section className="mx-auto max-w-5xl px-4 py-24 pt-32">
          <div className="rounded-3xl border border-[#17c3b2]/25 bg-black/40 p-8 md:p-10">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-[#17c3b2]">Accountability handoff</p>
            <h1 className="text-4xl font-black uppercase tracking-tighter md:text-5xl">Buddy System lives in the dashboard now</h1>
            <p className="mt-5 max-w-3xl text-sm text-gray-400 md:text-base">
              Web still explains the flow. The actual partner list, pending requests, and alert thresholds moved into the
              canonical dashboard so accountability settings stop fighting a duplicate manager.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={primaryActionHref}
                className={`inline-flex items-center justify-center rounded-xl border px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all ${
                  loading
                    ? 'pointer-events-none border-[#283347] text-gray-500'
                    : 'border-[#17c3b2]/40 bg-[#17c3b2]/10 text-[#17c3b2] hover:bg-[#17c3b2]/20'
                }`}
              >
                {loading ? 'Checking session...' : user ? 'Open buddy controls' : 'Log in for buddy controls'}
              </a>
              <a
                href={buddiesLaneUrl}
                className="inline-flex items-center justify-center rounded-xl border border-[#283347] px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:border-[#17c3b2]/30"
              >
                Open dashboard buddy lane
              </a>
              <a
                href={safetyLaneUrl}
                className="inline-flex items-center justify-center rounded-xl border border-[#283347] px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:border-[#17c3b2]/30"
              >
                Open safety lane
              </a>
            </div>

            {user && (
              <p className="mt-4 text-xs font-mono text-gray-500">
                Session found. Redirecting you into the canonical buddy lane now.
              </p>
            )}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { step: '01', title: 'Pick your watcher', copy: 'Choose the person who is actually allowed to call your bluff when the session goes sideways.' },
              { step: '02', title: 'Set the tripwires', copy: 'Tilt, losses, and zero-balance thresholds belong in the dashboard so the settings stay durable.' },
              { step: '03', title: 'Let the stack route alerts', copy: 'Dashboard owns the partner graph. Discord stays delivery. Web stays explainer.' },
            ].map(({ step, title, copy }) => (
              <div key={step} className="rounded-2xl border border-[#283347] bg-black/30 p-5">
                <p className="text-[#17c3b2] text-xs font-mono font-bold mb-2">{step}</p>
                <p className="text-white text-sm font-black uppercase tracking-tight mb-2">{title}</p>
                <p className="text-gray-400 text-xs">{copy}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-[#283347] bg-black/30 p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-500">What moved where</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#283347] bg-black/30 p-5">
                <p className="text-sm font-black uppercase tracking-tight text-white">Web keeps discovery</p>
                <p className="mt-3 text-sm text-gray-400">
                  Explain the system, set expectations, and route people into the right surface without pretending web is the manager.
                </p>
              </div>
              <div className="rounded-2xl border border-[#17c3b2]/25 bg-[#17c3b2]/5 p-5">
                <p className="text-sm font-black uppercase tracking-tight text-white">Dashboard owns the list</p>
                <p className="mt-3 text-sm text-gray-300">
                  Pending requests, accepts, removals, and durable thresholds now live in the canonical dashboard control surface.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
