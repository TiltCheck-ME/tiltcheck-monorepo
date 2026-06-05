/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import IntelBlockRenderer from '@/components/intel/IntelBlockRenderer';
import { getIntelShareSnapshot } from '@/lib/intel/share-store';

export default async function IntelSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const snapshot = getIntelShareSnapshot(token);

  if (!snapshot) {
    notFound();
  }

  return (
    <main className="public-page public-page--tight text-white">
      <section className="public-page-section px-4 py-12">
        <div className="landing-shell max-w-3xl space-y-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#17c3b2]">Shared intel</p>
            <h1 className="mt-2 text-3xl font-black">{snapshot.title}</h1>
            <p className="mt-2 text-sm text-gray-500">
              Expires {new Date(snapshot.expiresAt).toLocaleString()} · Not financial advice
            </p>
          </div>

          <IntelBlockRenderer blocks={snapshot.blocks} />

          <div className="flex flex-wrap gap-3 pt-4">
            <Link
              href="/ask"
              className="rounded-2xl border border-[#17c3b2]/30 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#17c3b2] hover:bg-[#17c3b2]/10"
            >
              Ask your own question
            </Link>
            <Link
              href="/casinos"
              className="rounded-2xl border border-[#283347] px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-white hover:border-[#17c3b2]/30"
            >
              Browse all casinos
            </Link>
          </div>

          <p className="text-[10px] text-gray-500">Made for Degens. By Degens.</p>
        </div>
      </section>
    </main>
  );
}
