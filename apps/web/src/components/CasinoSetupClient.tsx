/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-03 */
'use client';

import React from 'react';
import type { CasinoSiteId } from '@/lib/casino-install-setup';
import {
  buildCasinoTracks,
  getCasinoPreset,
  resolveCasinoPageUrl,
  resolveCasinoScriptUrl,
} from '@/lib/casino-install-setup';

function isAndroidChrome(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Android/i.test(ua) && /Chrome/i.test(ua) && !/Edg|Firefox/i.test(ua);
}

type Props = {
  siteId: CasinoSiteId;
};

export default function CasinoSetupClient({ siteId }: Props) {
  const preset = getCasinoPreset(siteId);
  const [trackId, setTrackId] = React.useState<'firefox' | 'edge'>('firefox');
  const [scriptUrl, setScriptUrl] = React.useState('');
  const [pageUrl, setPageUrl] = React.useState('');
  const [chromeWarning, setChromeWarning] = React.useState(false);
  const [copied, setCopied] = React.useState<'link' | 'dm' | null>(null);
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  React.useEffect(() => {
    const origin = window.location.origin;
    setScriptUrl(resolveCasinoScriptUrl(origin));
    setPageUrl(resolveCasinoPageUrl(preset, origin));
    setChromeWarning(isAndroidChrome());
  }, [preset]);

  const tracks = buildCasinoTracks(preset, scriptUrl || resolveCasinoScriptUrl());
  const track = tracks.find((t) => t.id === trackId) ?? tracks[0];

  const dmBlurb = pageUrl
    ? preset.dmBlurb.replace(preset.pageProduction, pageUrl)
    : preset.dmBlurb;

  async function copyText(text: string, kind: 'link' | 'dm') {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2500);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8 pb-16">
      <header className="mb-8">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#17c3b2] mb-2">
          {preset.eyebrow}
        </p>
        <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3">
          {preset.headline}
        </h1>
        <p className="text-sm text-gray-400 leading-relaxed">{preset.subtitle}</p>
      </header>

      {chromeWarning && (
        <div
          className="rounded-xl border border-[#ffd700]/45 bg-[#ffd700]/10 px-4 py-3 mb-6 text-sm text-[#ffd700] leading-relaxed"
          role="status"
        >
          You are in Chrome on Android — this will not work here. Open this same page in{' '}
          <strong className="text-white">Firefox</strong> or <strong className="text-white">Edge</strong>{' '}
          first, then follow the steps.
        </div>
      )}

      <section className="mb-8" aria-label="Choose browser">
        <p className="text-[10px] font-mono font-black uppercase tracking-[0.16em] text-gray-500 mb-3">
          Step 0 — pick your browser
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {tracks.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTrackId(item.id)}
              className={`text-left rounded-xl border px-4 py-4 transition-colors ${
                trackId === item.id
                  ? 'border-[#17c3b2]/60 bg-[#17c3b2]/12'
                  : 'border-[#283347] bg-black/30 hover:border-[#17c3b2]/25'
              }`}
            >
              <p className="text-sm font-black text-white mb-1">
                {item.label}
                {item.recommended && (
                  <span className="ml-2 text-[9px] font-mono text-[#17c3b2] uppercase tracking-widest">
                    Easiest
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">{item.tagline}</p>
            </button>
          ))}
        </div>
      </section>

      <ol className="space-y-4 mb-10" aria-label="Setup steps">
        {track.steps.map((step) => (
          <li
            key={`${track.id}-${step.order}`}
            className="rounded-2xl border border-[#283347] bg-[#12161e] p-5"
          >
            <div className="flex gap-3 mb-3">
              <span
                className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full border border-[#17c3b2]/50 bg-[#17c3b2]/10 text-sm font-black text-[#17c3b2]"
                aria-hidden
              >
                {step.order}
              </span>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wide text-white">{step.title}</h2>
                <p className="text-sm text-gray-400 leading-relaxed mt-1">{step.body}</p>
                {step.hint && (
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">{step.hint}</p>
                )}
              </div>
            </div>
            <a
              href={step.url}
              className="block w-full text-center py-3.5 px-4 bg-[#17c3b2] text-[#041210] text-sm font-black uppercase tracking-[0.12em] hover:brightness-110 transition"
              target="_blank"
              rel="noopener noreferrer"
              {...(step.order === 3
                ? {
                    'data-funnel-event': 'autovault_script_install_click',
                    'data-funnel-source': `dm-install-${siteId}`,
                    'data-funnel-label': step.actionLabel,
                  }
                : {})}
            >
              {step.actionLabel}
            </a>
          </li>
        ))}
      </ol>

      <section className="rounded-2xl border border-[#17c3b2]/30 bg-[#17c3b2]/5 p-5 mb-8">
        <p className="text-[10px] font-mono font-black uppercase tracking-[0.16em] text-[#17c3b2] mb-2">
          You are done when
        </p>
        <p className="text-sm text-gray-300 leading-relaxed">
          {preset.casinoName} is open, you are logged in, and the panel says{' '}
          <strong className="text-white">AUTOVAULT ON</strong>. Wins skim to vault on their own. Session
          wager and P/L show in the same panel.
        </p>
      </section>

      <section className="mb-8" aria-label="Common questions">
        <p className="text-[10px] font-mono font-black uppercase tracking-[0.16em] text-gray-500 mb-3">
          Quick answers
        </p>
        <div className="space-y-2">
          {preset.faq.map((item, index) => {
            const open = openFaq === index;
            return (
              <div key={item.q} className="rounded-xl border border-[#283347] bg-black/25 overflow-hidden">
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 text-sm font-bold text-white flex justify-between gap-3"
                  aria-expanded={open}
                  onClick={() => setOpenFaq(open ? null : index)}
                >
                  {item.q}
                  <span className="text-[#17c3b2] shrink-0" aria-hidden>
                    {open ? '−' : '+'}
                  </span>
                </button>
                {open && (
                  <p className="px-4 pb-3 text-sm text-gray-400 leading-relaxed border-t border-[#283347] pt-3">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-[#283347] bg-black/30 p-5 mb-8">
        <p className="text-[10px] font-mono font-black uppercase tracking-[0.16em] text-gray-500 mb-2">
          Send a friend (DM only — no links in casino chat)
        </p>
        <p className="text-xs text-gray-400 mb-3 leading-relaxed">
          Copy this and paste in a private message. Public chat links get you muted.
        </p>
        <textarea
          readOnly
          value={dmBlurb}
          rows={3}
          className="w-full bg-[#080a0d] border border-[#283347] text-gray-300 text-xs p-3 font-sans leading-relaxed resize-none mb-3"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => copyText(dmBlurb, 'dm')}
            data-funnel-event="dm_blurb_copy"
            data-funnel-source={`dm-install-${siteId}`}
            data-funnel-label="Copy DM text"
            className="flex-1 min-w-[140px] py-2.5 px-3 border border-[#17c3b2]/50 text-[#17c3b2] text-xs font-black uppercase tracking-wider hover:bg-[#17c3b2]/10 transition"
          >
            {copied === 'dm' ? 'Copied' : 'Copy DM text'}
          </button>
          <button
            type="button"
            onClick={() => copyText(pageUrl || preset.pageProduction, 'link')}
            data-funnel-event="install_link_copy"
            data-funnel-source={`dm-install-${siteId}`}
            data-funnel-label="Copy link only"
            className="flex-1 min-w-[140px] py-2.5 px-3 border border-[#283347] text-gray-300 text-xs font-black uppercase tracking-wider hover:border-[#17c3b2]/40 transition"
          >
            {copied === 'link' ? 'Copied' : 'Copy link only'}
          </button>
        </div>
      </section>

      <footer className="text-center text-[10px] font-mono uppercase tracking-[0.14em] text-gray-500">
        Made for Degens. By Degens.
      </footer>
    </div>
  );
}
