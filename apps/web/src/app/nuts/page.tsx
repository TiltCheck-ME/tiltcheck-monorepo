/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-03 */
import type { Metadata } from 'next';
import CasinoSetupClient from '@/components/CasinoSetupClient';
import { getCasinoPreset } from '@/lib/casino-install-setup';

const preset = getCasinoPreset('nuts');

export const metadata: Metadata = {
  title: 'Auto-lock wins on nuts.gg — 2 min setup',
  description:
    'Free auto-vault for nuts.gg. Skim heater wins to vault before you rinse. Plain steps for Firefox or Edge on Android.',
  openGraph: {
    title: 'Auto-lock wins on nuts.gg',
    description: 'Skim wins to vault on nuts. Big ON/OFF toggle. Free, non-custodial, 2-minute setup.',
    url: preset.pageProduction,
  },
};

export default function NutsSetupPage() {
  return <CasinoSetupClient siteId="nuts" />;
}
