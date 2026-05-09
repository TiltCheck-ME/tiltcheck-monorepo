/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09 */
'use client';

import dynamic from 'next/dynamic';

const AriaSlangProvider = dynamic(() => import('./AriaSlangProvider'), { ssr: false });
const FunnelTracker = dynamic(() => import('./FunnelTracker'), { ssr: false });

export default function ClientOnlyEffects() {
  return (
    <>
      <AriaSlangProvider />
      <FunnelTracker />
    </>
  );
}
