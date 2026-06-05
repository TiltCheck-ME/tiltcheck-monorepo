/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */

export const GRADE_SCORE: Record<string, number> = {
  'A+': 95, A: 90, 'A-': 85,
  'B+': 82, B: 78, 'B-': 73,
  'C+': 68, C: 62, 'C-': 55,
  'D+': 48, D: 40, 'D-': 33,
  F: 15,
};

export function slugifyCasinoName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeQuery(value: string): string {
  return value.trim().toLowerCase();
}
