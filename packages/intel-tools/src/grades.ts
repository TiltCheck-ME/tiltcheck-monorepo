/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-06 */

export const GRADE_SCORE: Record<string, number> = {
  'A+': 95, A: 90, 'A-': 85,
  'B+': 82, B: 78, 'B-': 73,
  'C+': 68, C: 62, 'C-': 55,
  'D+': 48, D: 40, 'D-': 33,
  F: 15,
};

/** Trim leading/trailing '-' without a backtracking regex (ReDoS-safe). */
function trimDashes(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && value[start] === '-') start += 1;
  while (end > start && value[end - 1] === '-') end -= 1;
  return value.slice(start, end);
}

export function slugifyCasinoName(name: string): string {
  return trimDashes(
    name
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-'),
  );
}

export function normalizeQuery(value: string): string {
  return value.trim().toLowerCase();
}

export interface RawCasino {
  name: string;
  grade: string;
  risk: string;
  category: string;
}

export function mapRawCasinos(raw: RawCasino[]) {
  return raw.map((casino) => ({
    ...casino,
    slug: slugifyCasinoName(casino.name),
    score: GRADE_SCORE[casino.grade] ?? 40,
  }));
}
