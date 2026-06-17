/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17 */
import Link from 'next/link';
import type { Metadata } from 'next';
import PublicPageHero from '@/components/PublicPageHero';

export const metadata: Metadata = {
  title: '404 — Page not found',
  description: 'This route does not exist. Head back to safety before you degen into a dead link.',
  robots: { index: false, follow: false },
};

const RECOVERY_LINKS = [
  { href: '/', label: 'Home', primary: true },
  { href: '/site-map', label: 'Site map', primary: false },
  { href: '/casinos', label: 'Casino trust', primary: false },
  { href: '/bonuses', label: 'Daily bonuses', primary: false },
  { href: '/touch-grass', label: 'Touch Grass', primary: false },
] as const;

export default function NotFound() {
  return (
    <main className="public-page public-page--tight text-white">
      <PublicPageHero
        compact
        eyebrow="ERR-404 // route_not_found"
        title="Wrong table."
        description={
          <p>
            This page got scrubbed, moved, or never existed. Bad bookmark, stale link, or someone
            shipped code mid-Plinko run. No cap — you are not getting a session here.
          </p>
        }
      />

      <section className="public-page-section px-4">
        <div className="landing-shell max-w-2xl">
          <div className="public-page-card border-red-500/20 bg-red-950/10 px-6 py-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-400">
              CRITICAL_FAILURE: ARCHITECTURAL_JUDGMENT_NOT_FOUND
            </p>
            <p className="mt-3 text-sm italic text-[#17c3b2]">
              The house takes your money. Dead routes take your time. Lock in and pick a real exit.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {RECOVERY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  link.primary
                    ? 'public-page-card block border-[#17c3b2]/40 bg-[#17c3b2]/10 px-5 py-4 text-center text-xs font-black uppercase tracking-[0.18em] text-[#17c3b2] hover:bg-[#17c3b2]/20 transition-colors'
                    : 'public-page-card block border-gray-800/60 bg-gray-900/30 px-5 py-4 text-center text-xs font-black uppercase tracking-[0.18em] text-gray-300 hover:border-[#17c3b2]/40 hover:text-[#17c3b2] transition-colors'
                }
              >
                {link.label}
              </Link>
            ))}
          </div>

          <p className="mt-10 text-center">
            <Link
              href="https://discord.gg/gdBsEJfCar"
              className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-600 hover:text-red-400 transition-colors"
            >
              Still sus? Harass the dev on Discord
            </Link>
          </p>
        </div>
      </section>

      <footer className="public-page-section px-4 pb-12 text-center text-sm text-gray-600">
        Made for Degens. By Degens.
      </footer>
    </main>
  );
}
