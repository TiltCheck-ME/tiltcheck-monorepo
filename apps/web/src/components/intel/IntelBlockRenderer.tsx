/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
'use client';

import Link from 'next/link';
import type { IntelBlock } from '@tiltcheck/intel-agent';
import IntelCasinoCard from '@/components/intel/IntelCasinoCard';
import IntelCasinoList from '@/components/intel/IntelCasinoList';

export default function IntelBlockRenderer({
  blocks,
  onShareList,
}: {
  blocks: IntelBlock[];
  onShareList?: (blocks: IntelBlock[]) => void;
}) {
  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.type === 'text') {
          return (
            <p key={`text-${index}`} className="text-sm leading-relaxed text-gray-200">
              {block.content}
            </p>
          );
        }

        if (block.type === 'casino_card') {
          return <IntelCasinoCard key={`card-${block.casino.slug}`} casino={block.casino} />;
        }

        if (block.type === 'casino_list') {
          return (
            <IntelCasinoList
              key={`list-${block.title}`}
              title={block.title}
              filters={block.filters}
              casinos={block.casinos}
              onShare={onShareList ? () => onShareList([block]) : undefined}
            />
          );
        }

        if (block.type === 'domain_scan') {
          return (
            <div key={`domain-${block.domain}`} className="rounded-2xl border border-[#283347] bg-black/30 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Domain scan</p>
              <p className="mt-1 font-mono text-sm text-white">{block.domain}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Threat</p>
                  <p className="text-sm font-bold text-white">{block.threatLevel}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">License</p>
                  <p className="text-sm font-bold text-white">{block.licenseStatus}</p>
                </div>
              </div>
            </div>
          );
        }

        if (block.type === 'cta') {
          return (
            <Link
              key={`cta-${block.href}-${index}`}
              href={block.href}
              className="inline-flex rounded-xl border border-[#17c3b2]/30 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#17c3b2] hover:bg-[#17c3b2]/10"
            >
              {block.label}
            </Link>
          );
        }

        if (block.type === 'login_prompt') {
          return (
            <div key={`login-${index}`} className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-sm text-amber-100">{block.reason}</p>
              <Link
                href="/login?return=/ask"
                className="mt-3 inline-flex text-[11px] font-black uppercase tracking-[0.16em] text-amber-200 hover:underline"
              >
                Log in to continue
              </Link>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
