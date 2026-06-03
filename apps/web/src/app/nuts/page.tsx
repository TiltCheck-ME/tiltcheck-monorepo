/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-02 */
import type { Metadata } from 'next';
import NutsSetupClient from './NutsSetupClient';
import { NUTS_SETUP_PAGE_PRODUCTION } from '@/lib/nuts-setup';

export const metadata: Metadata = {
  title: 'Auto-lock wins on nuts.gg — 2 min setup',
  description:
    'Free auto-vault for nuts.gg. Skim heater wins to vault before you rinse. Plain steps for Firefox or Edge on Android.',
  openGraph: {
    title: 'Auto-lock wins on nuts.gg',
    description: 'Skim wins to vault on nuts. Big ON/OFF toggle. Free, non-custodial, 2-minute setup.',
    url: NUTS_SETUP_PAGE_PRODUCTION,
  },
};

export default function NutsSetupPage() {
  return (
    <main className="min-h-screen bg-[#0a0c10] text-white">
      <NutsSetupClient />
    </main>
  );
}
