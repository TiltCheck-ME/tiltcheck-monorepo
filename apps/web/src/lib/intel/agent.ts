/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */

import { createDefaultIntelAgent, type IntelAgent } from '@tiltcheck/intel-agent';
import { filterLiveOperatorFacts, loadOperatorFactsFromMonorepo, type CasinoRecord } from '@tiltcheck/intel-tools';
import { CASINOS } from '@/lib/casino-trust';

let agentInstance: IntelAgent | null = null;

function toCasinoRecords(): CasinoRecord[] {
  return CASINOS.map((casino) => ({
    name: casino.name,
    grade: casino.grade,
    risk: casino.risk,
    category: casino.category,
    slug: casino.slug,
    score: casino.score,
  }));
}

export function getIntelAgent(): IntelAgent {
  if (!agentInstance) {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'https://api.tiltcheck.me').replace(/\/$/, '');
    agentInstance = createDefaultIntelAgent(
      apiBase,
      toCasinoRecords(),
      filterLiveOperatorFacts(loadOperatorFactsFromMonorepo()),
    );
  }
  return agentInstance;
}
