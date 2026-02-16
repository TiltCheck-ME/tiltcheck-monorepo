/**
 * JSON Schema-like validator for trust rollup snapshot batches.
 */

export interface RollupBatch {
  generatedAt: string;
  domain: {
    windowStart: number;
    windowEnd: number;
    domains: Record<string, { totalDelta: number; events: number; lastSeverity?: number; lastScore?: number }>;
  };
  casino: {
    windowStart: number;
    windowEnd: number;
    casinos: Record<string, { totalDelta: number; events: number; lastSeverity?: number; lastScore?: number }>;
  };
}

export interface RollupSnapshotFile {
  batches: RollupBatch[];
}

export function validateRollupSnapshotFile(data: any): data is RollupSnapshotFile {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.batches)) return false;
  for (const batch of data.batches) {
    if (typeof batch.generatedAt !== 'string') return false;
    if (!batch.domain || typeof batch.domain !== 'object') return false;
    if (!batch.casino || typeof batch.casino !== 'object') return false;
    if (typeof batch.domain.windowStart !== 'number') return false;
    if (typeof batch.domain.windowEnd !== 'number') return false;
    if (typeof batch.casino.windowStart !== 'number') return false;
    if (typeof batch.casino.windowEnd !== 'number') return false;
    if (typeof batch.domain.domains !== 'object' || typeof batch.casino.casinos !== 'object') return false;
  }
  return true;
}
