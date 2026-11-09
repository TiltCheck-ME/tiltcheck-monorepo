// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-09
import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { webPageJsonLd } from '@/lib/structured-data';

export const metadata: Metadata = {
  title: 'Touch Grass | Sign a timer, go outside | TiltCheck',
  description:
    'Sign a lock so 3am-you cannot put the stack back. Not a deposit. Solana wallet. Devnet.',
  openGraph: {
    title: 'Touch Grass | TiltCheck',
    description: 'Sign a timer with your wallet. Go outside. No nanny, no custody.',
    url: 'https://tiltcheck.me/cooldown',
  },
};

export default function CooldownLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd
        data={webPageJsonLd(
          'Touch Grass — sign a timer, go outside',
          'Sign a lock so 3am-you cannot put the stack back. Not a deposit. No custody.',
          '/cooldown',
        )}
      />
      {children}
    </>
  );
}
