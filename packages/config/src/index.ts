export const DEFAULT_SEVERITY_SCALE = [2, 4, 6, 8, 12];

export function computeSeverity(percentDrop: number): number {
  if (!isFinite(percentDrop) || percentDrop <= 0) return 1;
  return Math.min(5, Math.max(1, Math.ceil(percentDrop * 10)));
}

export function penaltyForSeverity(severity: number, scale: number[] = DEFAULT_SEVERITY_SCALE): number {
  if (severity < 1 || severity > 5) return 0;
  return -scale[severity - 1];
}

export function applySeverityPenalty(percentDrop: number, scale: number[] = DEFAULT_SEVERITY_SCALE): number {
  const sev = computeSeverity(percentDrop);
  return penaltyForSeverity(sev, scale);
}

export interface SeverityConfig {
  scale: number[];
  compute: typeof computeSeverity;
  penalty: typeof penaltyForSeverity;
}

export const severityConfig: SeverityConfig = {
  scale: DEFAULT_SEVERITY_SCALE,
  compute: computeSeverity,
  penalty: penaltyForSeverity,
};
