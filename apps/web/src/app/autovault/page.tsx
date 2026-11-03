/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-01 */
import { redirect } from 'next/navigation';

/** Pages twin uses /autovault. Next already owns /tools/auto-vault. */
export default function AutovaultAliasPage() {
  redirect('/tools/auto-vault');
}
