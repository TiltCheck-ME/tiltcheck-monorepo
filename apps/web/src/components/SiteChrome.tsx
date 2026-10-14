/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13 */
'use client';

import { Suspense, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import IntelChatWidget from '@/components/intel/IntelChatWidget';
import PublicPageFrame from '@/components/PublicPageFrame';
import { isTouchGrassEmbedPath } from '@/lib/touch-grass/is-touch-grass-embed-path';

/** DM install pages — no site nav, no footer clutter. */
const MINIMAL_CHROME_PREFIXES = ['/nuts', '/stake'];

function isMinimalChromePath(pathname: string): boolean {
  return MINIMAL_CHROME_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function SiteChromeBody({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const minimal = Boolean(
    pathname && (isMinimalChromePath(pathname) || isTouchGrassEmbedPath(pathname, mode))
  );

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
      <IntelChatWidget />
    </>
  );
}

function SiteChromeFallback({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const minimal = Boolean(
    pathname && (isMinimalChromePath(pathname) || isTouchGrassEmbedPath(pathname))
  );

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
      <IntelChatWidget />
    </>
  );
}

export default function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<SiteChromeFallback>{children}</SiteChromeFallback>}>
      <SiteChromeBody>{children}</SiteChromeBody>
    </Suspense>
  );
}
