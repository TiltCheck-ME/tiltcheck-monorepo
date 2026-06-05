/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
import Link from 'next/link';
import ToolPageHeader from '@/components/ToolPageHeader';

export default function ScannerPage() {
  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <ToolPageHeader
        centered
        eyebrow="Bonus intel"
        title="Live bonus scanner"
        description="Real-time bonus reads need the Chrome extension in your casino tab. Static feeds work without it."
      />

      <section className="px-4 py-10">
        <div className="mx-auto max-w-lg rounded-xl border border-[#283347] bg-black/40 p-8 text-center">
          <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">
            Extension not detected
          </p>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            Install the extension for live session bonus scanning. Or use the public bonus feed today.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/extension"
              className="inline-flex items-center justify-center rounded-xl bg-[#17c3b2] px-5 py-3 text-[11px] font-black uppercase tracking-widest text-black hover:bg-[#48d5c6]"
            >
              Get extension
            </Link>
            <Link
              href="/bonuses"
              className="inline-flex items-center justify-center rounded-xl border border-[#283347] px-5 py-3 text-[11px] font-black uppercase tracking-widest text-gray-300 hover:border-[#17c3b2]/40 hover:text-[#17c3b2]"
            >
              Bonus feed
            </Link>
            <Link
              href="/tools/collectclock"
              className="text-[11px] font-black uppercase tracking-widest text-gray-500 hover:text-[#17c3b2]"
            >
              CollectClock timers
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
