/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-17 */
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 — Page not found',
  description: 'This route does not exist. Head home before you chase a dead link.',
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
    <main className="public-page text-white">
      <section className="hero-surface">
        <div className="landing-shell landing-hero-centered">
          <span className="brand-eyebrow">ERR-404 // route_not_found</span>
          <h1 className="brand-page-title">Wrong table.</h1>
          <p className="landing-hero-subtitle landing-hero-subtitle--centered max-w-xl">
            Bad bookmark, deleted route, or a link that aged out. No casino tab here — pick a real
            exit before you tilt on a 404.
          </p>
        </div>
      </section>

      <section className="public-page-section px-4 pb-12">
        <div className="landing-shell max-w-2xl mx-auto">
          <div className="grid gap-3 sm:grid-cols-2">
            {RECOVERY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  link.primary
                    ? 'btn btn-primary text-center'
                    : 'public-page-card block border-gray-800/60 bg-gray-900/30 px-5 py-4 text-center text-xs font-black uppercase tracking-[0.18em] text-gray-300 hover:border-[#17c3b2]/40 hover:text-[#17c3b2] transition-colors'
                }
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="public-page-section px-4 pb-12 text-center text-sm text-gray-500">
        Made for Degens. By Degens.
      </footer>
    </main>
  );
}
