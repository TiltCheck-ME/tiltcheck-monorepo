/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
'use client';

import React from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import AutoVaultInstallStep from '@/components/AutoVaultInstallStep';
import {
  ANDROID_INSTALL_TRACKS,
  AUTOVAULT_ANDROID_STATIC_PATH,
  resolveAndroidPageUrl,
} from '@/lib/autovault-android-install';
import { isLocalDevOrigin } from '@/lib/lan-origin';

export default function AutoVaultAndroidPage() {
  const [trackId, setTrackId] = React.useState<'firefox' | 'edge'>('firefox');
  const [isLocal, setIsLocal] = React.useState(false);

  React.useEffect(() => {
    setIsLocal(isLocalDevOrigin(window.location.origin));
  }, []);

  const track = ANDROID_INSTALL_TRACKS.find((t) => t.id === trackId) ?? ANDROID_INSTALL_TRACKS[0];
  const pageUrl = resolveAndroidPageUrl(
    typeof window !== 'undefined' ? window.location.origin : undefined
  );

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-[#0a0c10] text-white">
        <div className="max-w-2xl mx-auto px-4 py-12 pt-32">
          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-2">
            <Link href="/tools" className="hover:text-[#17c3b2] transition-colors">
              Tools
            </Link>
            {' / '}
            <Link href="/tools/auto-vault" className="hover:text-[#17c3b2] hover:underline transition-colors">
              AutoVault
            </Link>
            {' / '}
            <span className="text-gray-400">Android install</span>
          </p>

          <h1 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">
            Android install — in order
          </h1>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Scan each QR top to bottom. Browser first, userscript manager second, AutoVault script
            third, then your casino. Stays ON until you toggle off. Non-custodial.
          </p>

          {isLocal && (
            <div className="rounded-xl border border-[#ffd700]/40 bg-[#ffd700]/10 px-4 py-3 mb-6 text-xs font-mono text-[#ffd700] leading-relaxed">
              Testing locally? Production URL after deploy:{' '}
              <span className="text-white">https://tiltcheck.me/tools/auto-vault/android</span>
            </div>
          )}

          <div className="rounded-2xl border border-[#17c3b2]/35 bg-[#17c3b2]/5 p-5 mb-6">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-[#17c3b2] mb-3">
              Pick your browser path
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {ANDROID_INSTALL_TRACKS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTrackId(item.id)}
                  className={`text-left rounded-xl border px-4 py-4 transition-colors ${
                    trackId === item.id
                      ? 'border-[#17c3b2]/60 bg-[#17c3b2]/15'
                      : 'border-[#283347] bg-black/30 hover:border-[#17c3b2]/30'
                  }`}
                >
                  <p className="text-xs font-black uppercase tracking-wide text-white mb-1">
                    {item.label}
                    {item.recommended && (
                      <span className="ml-2 text-[9px] text-[#17c3b2] font-mono">Recommended</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed">{item.summary}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {track.steps.map((step) => (
              <AutoVaultInstallStep key={`${track.id}-${step.id}`} step={step} />
            ))}
          </div>

          <div className="rounded-2xl border border-[#283347] bg-black/30 p-6 mb-6">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-gray-500 mb-2">
              After install
            </p>
            <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
              <li>First visit: full setup panel once. Tap Get started.</li>
              <li>Then: compact mode with the big AUTOVAULT toggle.</li>
              <li>Reload keeps it ON unless you explicitly turn it OFF.</li>
              <li>Disable any old separate AutoVault scripts so they do not fight this one.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[#283347] bg-black/30 p-6">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-gray-500 mb-2">
              Share this page
            </p>
            <p className="text-sm text-gray-400 mb-3">
              Static fallback (works even if JS is slow):{' '}
              <a href={AUTOVAULT_ANDROID_STATIC_PATH} className="text-[#17c3b2] hover:underline font-mono text-xs">
                tiltcheck.me{AUTOVAULT_ANDROID_STATIC_PATH}
              </a>
            </p>
            <p className="text-xs font-mono text-gray-500 break-all">{pageUrl}</p>
            <Link
              href="/tools/auto-vault/share"
              className="inline-block mt-4 text-[10px] font-mono uppercase tracking-widest text-[#17c3b2] hover:underline"
            >
              Desktop / copy-link share page
            </Link>
          </div>

          <p className="mt-10 text-center text-[10px] font-mono uppercase tracking-widest text-gray-600">
            Made for Degens. By Degens.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
