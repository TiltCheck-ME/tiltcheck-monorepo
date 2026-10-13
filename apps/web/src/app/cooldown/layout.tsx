// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12
import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { webPageJsonLd } from '@/lib/structured-data';

export const metadata: Metadata = {
  title: 'Cooldown | On-chain self-exclusion | TiltCheck',
  description:
    'Lock your Solana wallet from all play, categories, or specific games. Non-custodial Cooldown registry on devnet — stronger locks only, no admin bypass.',
  openGraph: {
    title: 'Cooldown | TiltCheck',
    description: 'On-chain self-exclusion for degens who want brakes without a nanny.',
    url: 'https://tiltcheck.me/cooldown',
  },
};

export default function CooldownLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={webPageJsonLd(
          'Cooldown — on-chain self-exclusion',
          'Connect wallet, pick scope, sign set_lock on Solana devnet. No custody.',
          '/cooldown',
        )}
      />
      {children}
    </>
  );
}
