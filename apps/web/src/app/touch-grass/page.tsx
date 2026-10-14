/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13 */

import TouchGrassHub from '@/components/touch-grass/TouchGrassHub';
import { parseTouchGrassMode } from '@/lib/touch-grass/hub-copy';

export default async function TouchGrassPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await searchParams;
  const mode = parseTouchGrassMode({ get: (name) => (name === 'mode' ? params.mode ?? null : null) });
  return <TouchGrassHub mode={mode} />;
}
