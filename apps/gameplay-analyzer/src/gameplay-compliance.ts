import type { AnalysisReport } from './types.js';

export type ComplianceSeverity = 'info' | 'warning' | 'critical';

export type ComplianceFlagCode =
  | 'RTP_OUTLIER'
  | 'WIN_CLUSTERING_ANOMALY'
  | 'GAMEPLAY_RULE_BREAKING_SIGNAL'
  | 'PROMO_VIOLATION_RISK'
  | 'STATE_RESTRICTION_CONFLICT';

export interface GameplayComplianceContext {
  stateCode?: string;
  topic?: 'igaming' | 'sportsbook' | 'sweepstakes';
  source?: 'live' | 'upload';
}

export interface RegulationSnapshot {
  stateCode: string;
  topic: string;
  status: string;
  sourceQuality?: string;
}

export interface ComplianceFlag {
  code: ComplianceFlagCode;
  severity: ComplianceSeverity;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface GameplayComplianceResult {
  allowedAction: 'allow' | 'warn' | 'block';
  riskScore: number;
  flags: ComplianceFlag[];
}

export function evaluateGameplayCompliance(
  report: AnalysisReport,
  context: GameplayComplianceContext,
  regulation?: RegulationSnapshot,
): GameplayComplianceResult {
  const flags: ComplianceFlag[] = [];

  const addFlag = (
    code: ComplianceFlagCode,
    severity: ComplianceSeverity,
    message: string,
    metadata?: Record<string, unknown>,
  ) => {
    flags.push({ code, severity, message, metadata });
  };

  if (report.pumpAnalysis.detected && report.pumpAnalysis.severity !== 'none') {
    addFlag(
      'RTP_OUTLIER',
      report.pumpAnalysis.severity === 'critical' ? 'critical' : 'warning',
      report.pumpAnalysis.reason,
      report.pumpAnalysis.metadata,
    );
  }

  if (report.clusterAnalysis.detected && report.clusterAnalysis.severity !== 'none') {
    addFlag(
      'WIN_CLUSTERING_ANOMALY',
      report.clusterAnalysis.severity === 'critical' ? 'critical' : 'warning',
      report.clusterAnalysis.reason,
      report.clusterAnalysis.metadata,
    );
  }

  if (report.driftAnalysis.detected && report.driftAnalysis.severity !== 'none') {
    addFlag(
      'GAMEPLAY_RULE_BREAKING_SIGNAL',
      report.driftAnalysis.severity === 'critical' ? 'critical' : 'warning',
      report.driftAnalysis.reason,
      report.driftAnalysis.metadata,
    );
  }

  if (report.overallRiskScore >= 70) {
    addFlag(
      'GAMEPLAY_RULE_BREAKING_SIGNAL',
      'critical',
      'Overall gameplay anomaly risk is high and may indicate unfairness or rule abuse.',
      { overallRiskScore: report.overallRiskScore },
    );
  }

  const normalizedStatus = regulation?.status?.toLowerCase();
  if (normalizedStatus === 'prohibited') {
    addFlag(
      'STATE_RESTRICTION_CONFLICT',
      'critical',
      `${regulation?.topic ?? context.topic ?? 'gameplay'} appears prohibited in ${regulation?.stateCode ?? context.stateCode}.`,
      regulation ? { regulation } : undefined,
    );
  } else if (normalizedStatus === 'restricted') {
    addFlag(
      'STATE_RESTRICTION_CONFLICT',
      'warning',
      `${regulation?.topic ?? context.topic ?? 'gameplay'} appears restricted in ${regulation?.stateCode ?? context.stateCode}.`,
      regulation ? { regulation } : undefined,
    );
  }

  const hasCoreAnomaly = flags.some((f) =>
    f.code === 'RTP_OUTLIER' ||
    f.code === 'WIN_CLUSTERING_ANOMALY' ||
    f.code === 'GAMEPLAY_RULE_BREAKING_SIGNAL',
  );

  if (hasCoreAnomaly && normalizedStatus === 'restricted') {
    addFlag(
      'PROMO_VIOLATION_RISK',
      'warning',
      'Anomaly detected in a restricted jurisdiction; avoid promotional or escalation messaging.',
      { source: context.source ?? 'live' },
    );
  }

  const criticalCount = flags.filter((f) => f.severity === 'critical').length;
  const warningCount = flags.filter((f) => f.severity === 'warning').length;

  const riskScore = Math.min(100, report.overallRiskScore + criticalCount * 15 + warningCount * 6);

  const allowedAction: GameplayComplianceResult['allowedAction'] =
    criticalCount > 0 ? 'block' : warningCount > 0 ? 'warn' : 'allow';

  return {
    allowedAction,
    riskScore,
    flags,
  };
}
