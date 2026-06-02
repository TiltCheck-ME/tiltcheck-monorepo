/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */

import React from 'react';
import type { AndroidInstallStep } from '@/lib/autovault-android-install';
import { qrForUrl } from '@/lib/autovault-android-install';

type Props = {
  step: AndroidInstallStep;
};

export default function AutoVaultInstallStep({ step }: Props) {
  const size = step.qrSize ?? 220;

  return (
    <article className="rounded-2xl border border-[#283347] bg-black/35 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div
          className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full border border-[#17c3b2]/50 bg-[#17c3b2]/10 text-sm font-black text-[#17c3b2]"
          aria-hidden
        >
          {step.order}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-sm font-black uppercase tracking-wide text-white">{step.title}</h3>
            {step.optional && (
              <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500 border border-[#283347] px-2 py-0.5">
                Pick one casino
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 leading-relaxed mb-4">{step.body}</p>
          <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
            <div className="shrink-0 p-2 border border-[#283347] bg-[#080a0d]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrForUrl(step.url, size)}
                width={size}
                height={size}
                alt={`QR code — ${step.title}`}
                className="block"
              />
            </div>
            <div className="min-w-0 flex-1 w-full">
              <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">
                {step.urlLabel}
              </p>
              <a
                href={step.url}
                className="text-xs font-mono text-[#17c3b2] break-all hover:underline"
                target={step.url.startsWith('http') ? '_blank' : undefined}
                rel={step.url.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {step.url}
              </a>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
