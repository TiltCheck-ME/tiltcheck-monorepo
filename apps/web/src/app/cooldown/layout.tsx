// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30
import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { webPageJsonLd } from '@/lib/structured-data';

export const metadata: Metadata = {
  title: 'Cooldown | On-chain wallet lock | TiltCheck',
  description:
    'Sign a lock so 3am-you cannot put the stack back. Not a deposit. Solana wallet. Devnet.',
  openGraph: {
    title: 'Cooldown | TiltCheck',
    description: 'On-chain wallet lock for degens who want brakes without a nanny.',
    url: 'https://tiltcheck.me/cooldown',
  },
};

export default function CooldownLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={webPageJsonLd(
          'Cooldown — on-chain wallet lock',
          'Sign a lock so 3am-you cannot put the stack back. Not a deposit. No custody.',
          '/cooldown',
        )}
      />
      {children}
    </>
  );
}
