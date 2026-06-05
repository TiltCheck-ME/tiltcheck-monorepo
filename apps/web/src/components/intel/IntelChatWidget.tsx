/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import IntelChatPanel from '@/components/intel/IntelChatPanel';

const WIDGET_EXCLUDE_PREFIXES = ['/nuts', '/stake'];

function shouldShowWidget(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.startsWith('/ask')) return false;
  return !WIDGET_EXCLUDE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function IntelChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    void fetch('/api/funnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'cta_click',
        step: 'intel_widget_open',
        path: pathname ?? '/',
      }),
    }).catch(() => {});
  }, [open, pathname]);

  if (!shouldShowWidget(pathname)) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Open intel chat"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 rounded-full border border-[#17c3b2]/40 bg-[#0a0c10]/95 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#17c3b2] shadow-lg backdrop-blur hover:bg-[#17c3b2]/10"
      >
        Ask Intel
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/50 p-4 sm:items-center sm:justify-center">
          <div className="flex h-[min(720px,100dvh)] w-full max-w-lg flex-col rounded-3xl border border-[#283347] bg-[#0a0c10] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#17c3b2]">Intel agent</p>
                <h2 className="text-lg font-black text-white">Trust Q&amp;A</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-[#283347] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <IntelChatPanel
                compact
                onOpenFull={() => {
                  setOpen(false);
                  window.location.href = '/ask';
                }}
              />
            </div>
            <Link
              href="/ask"
              className="mt-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-gray-500 hover:text-[#17c3b2]"
            >
              Full page · Made for Degens. By Degens.
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
