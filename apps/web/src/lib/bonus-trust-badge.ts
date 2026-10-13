// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-12

import {
  findCasinoByBrandName,
  findLiveTrustScore,
  gradeFromNumericScore,
  type LiveTrustScore,
} from '@/lib/casino-trust';

export const FORBIDDEN_BONUS_TRUST_PLACEHOLDERS = [
  '[TRUST SCORE: LOADING]',
  'TRUST SCORE: LOADING',
] as const;

export type BonusTrustBadge =
  | { kind: 'live'; grade: string; score: number; slug: string; label: string }
  | { kind: 'curated'; grade: string; score: number; slug: string; label: string }
  | { kind: 'unknown'; label: string; slug?: string };

export function resolveBonusTrustBadge(brand: string, liveScores: LiveTrustScore[]): BonusTrustBadge {
  const casino = findCasinoByBrandName(brand);
  if (!casino) {
    return {
      kind: 'unknown',
      label: 'Trust not graded for this brand yet',
    };
  }

  const live = findLiveTrustScore(casino, liveScores);
  if (live) {
    const score = Math.round(live.currentScore);
    return {
      kind: 'live',
      grade: gradeFromNumericScore(score),
      score,
      slug: casino.slug,
      label: `Live trust ${gradeFromNumericScore(score)} (${score}/100)`,
    };
  }

  return {
    kind: 'curated',
    grade: casino.grade,
    score: casino.score,
    slug: casino.slug,
    label: `Curated trust ${casino.grade} (${casino.score}/100)`,
  };
}

export function assertNoForbiddenTrustPlaceholders(text: string): void {
  for (const forbidden of FORBIDDEN_BONUS_TRUST_PLACEHOLDERS) {
    if (text.includes(forbidden)) {
      throw new Error(`Forbidden trust placeholder rendered: ${forbidden}`);
    }
  }
}
