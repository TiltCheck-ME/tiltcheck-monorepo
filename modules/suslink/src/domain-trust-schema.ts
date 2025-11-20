/**
 * JSON Schema-like validator for domain trust snapshot
 * Avoids external deps; simple structural checks only.
 */

export interface DomainTrustSnapshotEntry {
  domain: string;
  score: number;
}

export interface DomainTrustSnapshot {
  generatedAt: string;
  domains: DomainTrustSnapshotEntry[];
}

export function validateDomainTrustSnapshot(data: any): data is DomainTrustSnapshot {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.generatedAt !== 'string') return false;
  if (!Array.isArray(data.domains)) return false;
  for (const entry of data.domains) {
    if (!entry || typeof entry !== 'object') return false;
    if (typeof entry.domain !== 'string') return false;
    if (typeof entry.score !== 'number') return false;
    if (entry.score < 0 || entry.score > 100) return false;
  }
  return true;
}
