import { eventRouter } from '@tiltcheck/event-router';
import type { TiltCheckEvent, GameplayAnomalyEvent } from '@tiltcheck/types';
import { Client as ESClient } from '@elastic/elasticsearch';
import { getStateTopicStatus } from './regulations-retrieval.js';

type ComplianceSeverity = 'info' | 'warning' | 'critical';

type ComplianceFlagCode =
  | 'RTP_OUTLIER'
  | 'WIN_CLUSTERING_ANOMALY'
  | 'GAMEPLAY_RULE_BREAKING_SIGNAL'
  | 'PROMO_VIOLATION_RISK'
  | 'STATE_RESTRICTION_CONFLICT';

interface RegulationSnapshot {
  stateCode: string;
  topic: string;
  status: string;
  sourceQuality?: string;
}

interface ComplianceFlag {
  code: ComplianceFlagCode;
  severity: ComplianceSeverity;
  message: string;
}

interface GameplayComplianceResult {
  allowedAction: 'allow' | 'warn' | 'block';
  riskScore: number;
  flags: ComplianceFlag[];
}

const DEFAULT_TOPIC = (process.env.TILT_AGENT_DEFAULT_REG_TOPIC || 'igaming').toLowerCase();
const DEFAULT_STATE = process.env.TILT_AGENT_DEFAULT_STATE_CODE?.toUpperCase();
const ALERT_CHANNEL_ID = process.env.REGULATIONS_ALERTS_CHANNEL_ID || '1447524353263665252';
const ALERT_GUILD_ID = process.env.REGULATIONS_ALERTS_GUILD_ID || '1446973117472964620';

function evaluateGameplayComplianceLite(
  event: GameplayAnomalyEvent,
  regulation?: RegulationSnapshot,
): GameplayComplianceResult {
  const flags: ComplianceFlag[] = [];

  if (event.anomalyType === 'pump') {
    flags.push({ code: 'RTP_OUTLIER', severity: event.severity, message: event.reason });
  } else if (event.anomalyType === 'win_clustering') {
    flags.push({ code: 'WIN_CLUSTERING_ANOMALY', severity: event.severity, message: event.reason });
  } else if (event.anomalyType === 'rtp_drift') {
    flags.push({ code: 'GAMEPLAY_RULE_BREAKING_SIGNAL', severity: event.severity, message: event.reason });
  }

  const normalizedStatus = regulation?.status?.toLowerCase();
  if (normalizedStatus === 'prohibited') {
    flags.push({
      code: 'STATE_RESTRICTION_CONFLICT',
      severity: 'critical',
      message: `${regulation?.topic} appears prohibited in ${regulation?.stateCode}.`,
    });
  } else if (normalizedStatus === 'restricted') {
    flags.push({
      code: 'STATE_RESTRICTION_CONFLICT',
      severity: 'warning',
      message: `${regulation?.topic} appears restricted in ${regulation?.stateCode}.`,
    });
    flags.push({
      code: 'PROMO_VIOLATION_RISK',
      severity: 'warning',
      message: 'Avoid promotional escalation in a restricted jurisdiction.',
    });
  }

  const criticalCount = flags.filter((f) => f.severity === 'critical').length;
  const warningCount = flags.filter((f) => f.severity === 'warning').length;
  const base = event.severity === 'critical' ? 80 : 55;
  const riskScore = Math.min(100, base + criticalCount * 12 + warningCount * 6);

  const allowedAction: GameplayComplianceResult['allowedAction'] =
    criticalCount > 0 ? 'block' : warningCount > 0 ? 'warn' : 'allow';

  return { allowedAction, riskScore, flags };
}

function getEsClient(): ESClient | null {
  const url = process.env.ELASTIC_URL;
  const apiKey = process.env.ELASTIC_API_KEY;
  if (!url || !apiKey) return null;
  return new ESClient({ node: url, auth: { apiKey } });
}

async function getRegulationSnapshot(
  esClient: ESClient | null,
  stateCode: string | undefined,
  topic: string,
): Promise<RegulationSnapshot | undefined> {
  if (!esClient || !stateCode) return undefined;

  try {
    const rows = await getStateTopicStatus(esClient, stateCode, topic);
    const row = rows[0];
    if (!row) return undefined;

    return {
      stateCode,
      topic,
      status: row.status,
      sourceQuality: 'primary',
    };
  } catch {
    return undefined;
  }
}

async function postComplianceAlert(
  discordClient: any,
  event: GameplayAnomalyEvent,
  compliance: GameplayComplianceResult,
  stateCode?: string,
  topic?: string,
) {
  const channel = await discordClient.channels.fetch(ALERT_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  if (ALERT_GUILD_ID && 'guild' in channel && channel.guild?.id !== ALERT_GUILD_ID) {
    return;
  }

  const headline =
    compliance.allowedAction === 'block'
      ? '[CRITICAL] Gameplay compliance block'
      : compliance.allowedAction === 'warn'
        ? '[WARN] Gameplay compliance warning'
        : '[INFO] Gameplay compliance clear';

  const flags = compliance.flags
    .slice(0, 5)
    .map((f) => `- ${f.code}: ${f.message}`)
    .join('\n');

  const msg = [
    `${headline}`,
    `User: <@${event.userId}> | Casino: ${event.casinoId}`,
    `Anomaly: ${event.anomalyType} | Severity: ${event.severity} | Confidence: ${(event.confidence * 100).toFixed(1)}%`,
    `Risk score: ${compliance.riskScore}`,
    `State/topic: ${stateCode || 'n/a'}/${topic || 'n/a'}`,
    '',
    flags || '- No flags',
  ].join('\n');

  await channel.send(msg);
}

export function initializeGameplayComplianceBridge(discordClient: any): void {
  const esClient = getEsClient();

  const handler = async (evt: TiltCheckEvent<GameplayAnomalyEvent>) => {
    const data = evt.data;
    if (!data?.userId) return;

    const stateCode = DEFAULT_STATE;
    const topic = DEFAULT_TOPIC;
    const regulation = await getRegulationSnapshot(esClient, stateCode, topic);

    const compliance = evaluateGameplayComplianceLite(data, regulation);

    if (compliance.allowedAction === 'allow') return;

    await postComplianceAlert(discordClient, data, compliance, stateCode, topic);
  };

  eventRouter.subscribe('fairness.pump.detected', handler, 'discord-bot');
  eventRouter.subscribe('fairness.cluster.detected', handler, 'discord-bot');
  eventRouter.subscribe('fairness.drift.detected' as any, handler, 'discord-bot');

  console.log('[GameplayCompliance] Bridge subscribed to fairness events');
}


