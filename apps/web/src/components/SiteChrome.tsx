/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-03 */
'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicPageFrame from '@/components/PublicPageFrame';

/** DM install pages — no site nav, no footer clutter. */
const MINIMAL_CHROME_PREFIXES = ['/nuts', '/stake'];

function isMinimalChromePath(pathname: string): boolean {
  return MINIMAL_CHROME_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const minimal = pathname ? isMinimalChromePath(pathname) : false;

  if (minimal) {
    return (
      <main id="main-content" className="min-h-screen bg-[#0a0c10] text-white">
        {children}
      </main>
    );
  }

  return (
    <>
      <Header />
      <main id="main-content" className="nav-main-content">
        <PublicPageFrame>{children}</PublicPageFrame>
      </main>
      <div className="nav-main-content">
        <Footer />
      </div>
    </>
  );
}
