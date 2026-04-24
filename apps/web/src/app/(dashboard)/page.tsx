/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-23 */
import { getDashboardHandoffUrl, getWebLoginRedirect } from '@/lib/dashboard-handoff';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="rounded-3xl border border-[#17c3b2]/25 bg-black/40 p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#17c3b2]">
          Dashboard handoff
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase tracking-tighter text-white">
          Canonical controls moved to the dashboard
        </h1>
        <p className="mt-4 max-w-3xl text-sm text-gray-400">
          This legacy dashboard shell stays here only to route you into the canonical control
          surface. Profile, LockVault timers, Wallet Lock cooldowns, AutoVault rules, safety
          filters, and buddy ownership now live in the TiltCheck dashboard.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={getWebLoginRedirect('/dashboard')}
            className="inline-flex items-center justify-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] transition-all hover:bg-[#17c3b2]/20"
          >
            Log in on web first
          </a>
          <a
            href={getDashboardHandoffUrl('/dashboard')}
            className="inline-flex items-center justify-center rounded-xl border border-[#283347] px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:border-[#17c3b2]/30"
          >
            Open dashboard controls
          </a>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            href: getDashboardHandoffUrl('/dashboard?tab=safety'),
            title: 'Safety controls',
            copy: 'Durable exclusions and temptation filters moved under dashboard ownership.',
          },
          {
            href: getDashboardHandoffUrl('/tools/auto-vault'),
            title: 'Vault lane',
            copy: 'LockVault timers, Wallet Lock cooldowns, and AutoVault rules now live in the dashboard vault lane.',
          },
          {
            href: getDashboardHandoffUrl('/tools/buddy-system'),
            title: 'Buddy lane',
            copy: 'Accountability partners and alert thresholds moved into the dashboard flow.',
          },
        ].map(({ href, title, copy }) => (
          <a
            key={title}
            href={href}
            className="rounded-2xl border border-[#283347] bg-black/30 p-6 transition-colors hover:border-[#17c3b2]/30"
          >
            <p className="text-sm font-black uppercase tracking-tight text-white">{title}</p>
            <p className="mt-3 text-sm text-gray-400">{copy}</p>
          </a>
        ))}
      </section>
    </div>
  );
}
