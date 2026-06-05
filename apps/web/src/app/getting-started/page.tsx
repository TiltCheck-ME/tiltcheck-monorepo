/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
import Link from 'next/link';
import PublicPageHero, { PublicPageSectionHeader } from '@/components/PublicPageHero';

const paths = [
  {
    tag: 'Install',
    title: 'Extension or AutoVault',
    body: 'Chrome extension for in-tab guards. /nuts or /stake for mobile AutoVault — DM links only.',
    href: '/extension',
    label: 'Extension guide',
  },
  {
    tag: 'Learn',
    title: 'How it works',
    body: 'What TiltCheck watches, what it can prove, and how exits get enforced.',
    href: '/how-it-works',
    label: 'Read the flow',
  },
  {
    tag: 'Help',
    title: 'Crisis resources',
    body: 'TiltCheck is brakes, not therapy. Real help exists.',
    href: '/touch-grass',
    label: 'Get help',
    danger: true,
  },
];

const steps = [
  { n: '1', title: 'Install', body: 'Extension zip or mobile userscript from /tools install links.' },
  { n: '2', title: 'Set rules', body: 'Profit target, loss cap, cooldown — dashboard or script panel.' },
  { n: '3', title: 'Play once', body: 'Open a supported session. TiltCheck reads the tab, not your keys.' },
];

export default function GettingStartedPage() {
  return (
    <main className="public-page public-page--tight text-white">
      <PublicPageHero
        compact
        eyebrow="Start here"
        title="Zero to first guarded session."
        description={<p>Pick a path below. No marketing fog.</p>}
      />

      <section className="public-page-section px-4">
        <div className="landing-shell">
          <div className="public-page-grid public-page-grid--3">
            {paths.map((path) => (
              <article
                key={path.title}
                className={`public-page-card h-full ${path.danger ? 'border-[#ef4444]/30 bg-[#ef4444]/5' : ''}`}
              >
                <p className={`public-page-card__eyebrow ${path.danger ? 'text-[#ef4444]' : ''}`}>{path.tag}</p>
                <h2 className="public-page-card__title">{path.title}</h2>
                <p className="public-page-card__copy">{path.body}</p>
                <Link
                  href={path.href}
                  className={`mt-4 inline-block text-[11px] font-black uppercase tracking-wider hover:underline ${path.danger ? 'text-[#ef4444]' : 'text-[#17c3b2]'}`}
                >
                  {path.label}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell max-w-3xl">
          <PublicPageSectionHeader compact eyebrow="Quick start" title="Three steps." />
          <ol className="space-y-4">
            {steps.map((step) => (
              <li key={step.n} className="flex gap-4 public-page-card">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#17c3b2] text-sm font-black text-black">
                  {step.n}
                </span>
                <div>
                  <h3 className="public-page-card__title !mt-0">{step.title}</h3>
                  <p className="public-page-card__copy">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="public-page-section px-4">
        <div className="landing-shell max-w-3xl">
          <details className="rounded-xl border border-[#283347] bg-black/25 group">
            <summary className="cursor-pointer list-none px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-black uppercase tracking-tight text-white">What you do not get</span>
                <span className="text-[#17c3b2] font-black transition-transform group-open:rotate-45">+</span>
              </div>
            </summary>
            <div className="border-t border-[#283347] px-5 py-4 text-sm text-gray-400 space-y-2">
              <p>No guaranteed wins. House math still wins long-term — we add visibility and hard stops.</p>
              <p>No custody. We never hold funds or keys.</p>
              <p>No cure for addiction — use NCPG if you need real help.</p>
            </div>
          </details>
        </div>
      </section>
    </main>
  );
}
