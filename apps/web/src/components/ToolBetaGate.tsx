/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-03 */
'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { INSTALL_SURFACES } from '@/lib/tool-registry';

type Props = {
  title: string;
  children: ReactNode;
};

/** Banner on power-user / docs tool pages — points people to DM install links first. */
export default function ToolBetaGate({ title, children }: Props) {
  return (
    <>
      <div className="mx-auto max-w-3xl px-4 pt-28 pb-4">
        <div className="rounded-2xl border border-[#ffd700]/35 bg-[#ffd700]/8 px-4 py-4 text-sm text-gray-300 leading-relaxed">
          <p className="text-[10px] font-mono font-black uppercase tracking-[0.16em] text-[#ffd700] mb-2">
            {title} — power-user / docs
          </p>
          <p className="mb-3">
            Sending someone AutoVault? Use the plain install links — not this page. Same script, easier steps.
          </p>
          <div className="flex flex-wrap gap-2">
            {INSTALL_SURFACES.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center rounded-lg border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#17c3b2] hover:bg-[#17c3b2]/20 transition"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/tools"
              className="inline-flex items-center rounded-lg border border-[#283347] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-white transition"
            >
              All tools
            </Link>
          </div>
        </div>
      </div>
      {children}
    </>
  );
}
