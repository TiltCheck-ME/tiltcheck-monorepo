/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { INSTALL_SURFACES } from '@/lib/tool-registry';

type Props = {
  title: string;
  children: ReactNode;
};

/** Points power-user pages at DM install links first. */
export default function ToolBetaGate({ title, children }: Props) {
  return (
    <>
      <div className="mx-auto max-w-3xl px-4 pt-28 pb-3">
        <div className="rounded-xl border border-[#ffd700]/35 bg-[#ffd700]/8 px-4 py-3 text-sm text-gray-300">
          <p className="text-[10px] font-mono font-black uppercase tracking-[0.16em] text-[#ffd700] mb-2">
            {title} — docs page
          </p>
          <p className="mb-2 text-sm">Sharing AutoVault? Use install links — same script, easier steps.</p>
          <div className="flex flex-wrap gap-2">
            {INSTALL_SURFACES.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center rounded-lg border border-[#17c3b2]/40 bg-[#17c3b2]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#17c3b2] hover:bg-[#17c3b2]/20 transition"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/tools"
              className="inline-flex items-center rounded-lg border border-[#283347] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-white transition"
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
