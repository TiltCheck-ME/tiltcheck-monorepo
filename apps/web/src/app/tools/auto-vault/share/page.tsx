/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
'use client';

import React from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import {
  AUTOVAULT_SHARE_SCRIPT_PRODUCTION,
  buildShareQrImageUrl,
  resolveShareUrls,
} from '@/lib/share-qr';
import { isLocalDevOrigin } from '@/lib/lan-origin';

export default function AutoVaultSharePage() {
  const [copied, setCopied] = React.useState(false);
  const [lanIp, setLanIp] = React.useState<string | null>(null);
  const [isLocal, setIsLocal] = React.useState(false);
  const [qrReady, setQrReady] = React.useState(false);
  const [urls, setUrls] = React.useState(() => ({
    pageUrl: '',
    scriptUrl: '',
    qrPageUrl: '',
    qrScriptUrl: '',
  }));

  React.useEffect(() => {
    const origin = window.location.origin;
    const port = window.location.port || '3000';
    const localDev = isLocalDevOrigin(origin);
    setIsLocal(localDev);

    const finish = (next: ReturnType<typeof resolveShareUrls>) => {
      setUrls(next);
      setQrReady(Boolean(next.qrPageUrl && next.qrScriptUrl));
    };

    if (!localDev) {
      finish(resolveShareUrls(origin));
      return;
    }

    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!isLocalhost) {
      finish(resolveShareUrls(origin));
      return;
    }

    fetch(`/api/dev/share-origin?port=${encodeURIComponent(port)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { phoneOrigin?: string; lanIp?: string | null } | null) => {
        if (data?.phoneOrigin) {
          setLanIp(data.lanIp ?? null);
          finish(resolveShareUrls(origin, { qrOrigin: data.phoneOrigin }));
        } else {
          finish(resolveShareUrls(origin));
        }
      })
      .catch(() => {
        finish(resolveShareUrls(origin));
      });
  }, []);

  const installUrl = urls.scriptUrl || AUTOVAULT_SHARE_SCRIPT_PRODUCTION;
  const pageQrUrl = urls.qrPageUrl ? buildShareQrImageUrl(urls.qrPageUrl, 300) : '';
  const scriptQrUrl = urls.qrScriptUrl ? buildShareQrImageUrl(urls.qrScriptUrl, 220) : '';

  const copyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(installUrl);
      } else {
        throw new Error('clipboard unavailable');
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-[#0a0c10] text-white">
        <div className="max-w-lg mx-auto px-4 py-12 pt-32">
          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-2">
            <Link href="/tools" className="hover:text-[#17c3b2] transition-colors">
              Tools
            </Link>
            {' / '}
            <Link href="/tools/auto-vault" className="hover:text-[#17c3b2] hover:underline transition-colors">
              AutoVault
            </Link>
            {' / '}
            <span className="text-gray-400">Share</span>
          </p>

          <h1 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">
            One link. Stake.us + nuts.gg.
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            Share Edition — mobile-first panel, big AUTOVAULT toggle, stays on until you turn it off.
            Non-custodial. Same session as the casino tab.
          </p>

          <div className="rounded-2xl border border-[#283347] bg-black/30 p-5 mb-6">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-gray-500 mb-2">
              Android — install in order
            </p>
            <p className="text-sm text-gray-300 mb-3">
              New phone? Use the step-by-step QR wizard: browser → userscript manager → AutoVault → casino.
            </p>
            <Link
              href="/tools/auto-vault/android"
              className="inline-flex items-center justify-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#17c3b2] hover:bg-[#17c3b2]/20 transition-colors"
            >
              Open Android QR install guide
            </Link>
          </div>

          {isLocal && (
            <div className="rounded-xl border border-[#ffd700]/40 bg-[#ffd700]/10 px-4 py-3 mb-6 text-xs font-mono text-[#ffd700] leading-relaxed">
              Local dev only — share page is not live on tiltcheck.me yet. Use the QR below (LAN IP
              {lanIp ? `: ${lanIp}` : ''}), not tiltcheck.me links.
            </div>
          )}

          <div className="rounded-2xl border border-[#17c3b2]/35 bg-black/40 p-6 mb-6 text-center">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-[#17c3b2] mb-4">
              Scan to open this page on your phone
            </p>
            <div className="inline-block p-3 border border-[#283347] bg-[#080a0d] min-h-[300px] min-w-[300px] flex items-center justify-center">
              {qrReady ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={pageQrUrl}
                  width={300}
                  height={300}
                  alt="QR code — opens AutoVault share install page"
                  className="block"
                />
              ) : (
                <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 px-4">
                  Preparing phone QR…
                </p>
              )}
            </div>
            <p className="mt-4 text-[10px] font-mono text-gray-500 break-all">
              {urls.qrPageUrl || 'Resolving install URL…'}
            </p>
            {isLocal && (
              <p className="mt-3 text-xs text-[#ffd700] font-mono leading-relaxed">
                Local dev only — not deployed to tiltcheck.me yet. QR uses your LAN IP
                {lanIp ? ` (${lanIp})` : ''} when you open this page on localhost. Same Wi‑Fi
                required for phone scans.
              </p>
            )}
            {!isLocal && (
              <p className="mt-3 text-xs text-gray-500 font-mono leading-relaxed">
                Production install page — scan or copy below.
              </p>
            )}
            <div className="mt-6 pt-5 border-t border-[#283347]">
              <p className="text-[10px] font-mono font-black uppercase tracking-[0.14em] text-gray-500 mb-3">
                Direct script QR (Tampermonkey / Violentmonkey)
              </p>
              <div className="inline-block p-2 border border-[#283347] bg-[#080a0d] min-h-[220px] min-w-[220px] flex items-center justify-center">
                {qrReady ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={scriptQrUrl}
                    width={220}
                    height={220}
                    alt="QR code — direct userscript install URL"
                    className="block"
                  />
                ) : (
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 px-3">
                    Preparing…
                  </p>
                )}
              </div>
              <p className="mt-2 text-[10px] font-mono text-gray-500 break-all">
                {urls.qrScriptUrl || 'Resolving script URL…'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#17c3b2]/35 bg-black/40 p-6 mb-6">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-[#17c3b2] mb-3">
              Install link
            </p>
            <div className="flex gap-2 flex-col sm:flex-row">
              <input
                readOnly
                value={installUrl}
                className="flex-1 bg-[#080a0d] border border-[#283347] text-white text-xs font-mono px-3 py-3 rounded-none"
                aria-label="Userscript install URL"
              />
              <button
                type="button"
                onClick={() => void copyLink()}
                className="shrink-0 border border-[#17c3b2]/40 bg-[#17c3b2]/10 text-[#17c3b2] px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] hover:bg-[#17c3b2]/20 transition-colors"
              >
                Copy link
              </button>
            </div>
            {copied && (
              <p className="mt-2 text-xs font-mono text-[#17c3b2]">Link copied. Send it to your degen group chat.</p>
            )}
            <a
              href={installUrl}
              className="mt-4 block text-center rounded-xl border-2 border-[#17c3b2]/50 bg-[#17c3b2]/10 px-5 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#17c3b2] hover:bg-[#17c3b2]/20 transition-all"
            >
              Install in Tampermonkey
            </a>
            {isLocal && urls.qrScriptUrl && urls.qrScriptUrl !== installUrl && (
              <p className="mt-3 text-[10px] font-mono text-gray-500 break-all">
                Phone install URL:{' '}
                <a href={urls.qrScriptUrl} className="text-[#17c3b2] hover:underline">
                  {urls.qrScriptUrl}
                </a>
              </p>
            )}
            <p className="mt-3 text-[10px] font-mono text-gray-500">
              {isLocal ? (
                <>
                  Production goes live after deploy:{' '}
                  <span className="text-gray-600">{AUTOVAULT_SHARE_SCRIPT_PRODUCTION}</span>
                </>
              ) : (
                <>
                  Production fallback:{' '}
                  <a href={AUTOVAULT_SHARE_SCRIPT_PRODUCTION} className="text-[#17c3b2] hover:underline">
                    {AUTOVAULT_SHARE_SCRIPT_PRODUCTION}
                  </a>
                </>
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-[#283347] bg-black/30 p-6 mb-6">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-gray-500 mb-3">
              Android
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
              <li>
                Sideload <span className="font-mono text-white">Violentmonkey</span> or{' '}
                <span className="font-mono text-white">Tampermonkey</span> from the official APK (not Play Store).
              </li>
              <li>Open this page in that browser and tap Install, or paste the link as a new script.</li>
              <li>
                Log in on <span className="font-mono text-white">stake.us</span> or{' '}
                <span className="font-mono text-white">nuts.gg</span>. One-time setup, then the big toggle.
              </li>
            </ol>
          </div>

          <div className="rounded-2xl border border-[#283347] bg-black/30 p-6">
            <p className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-gray-500 mb-2">
              What you get
            </p>
            <ul className="text-sm text-gray-300 space-y-1.5">
              <li>
                <span className="font-mono font-bold text-white">Stake.us</span> — full vault API skim
              </li>
              <li>
                <span className="font-mono text-white">nuts.gg</span> — WebSocket vault (optional auto-tip in
                settings, off by default)
              </li>
              <li>Remembers ON across reloads unless you toggle off</li>
            </ul>
            <p className="mt-4 text-xs font-mono text-gray-500">
              Power-user multi-site script still at{' '}
              <Link href="/userscripts/tiltcheck-autovault.user.js" className="text-[#17c3b2] hover:underline">
                tiltcheck-autovault.user.js
              </Link>
              . Dashboard rules at{' '}
              <Link href="/tools/auto-vault" className="text-[#17c3b2] hover:underline">
                auto-vault
              </Link>
              .
            </p>
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
