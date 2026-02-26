import { Client as ESClient } from '@elastic/elasticsearch';

const TELEMETRY_INDEX = 'tiltcheck-telemetry';

export type InterventionSeverity = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export type InterventionAction =
  | 'send_dm_intervention'
  | 'deterministic_message'
  | 'none';

export interface EsqlJsonResponse {
  columns?: Array<{ name: string }>;
  rows?: Array<Array<string | number | null>>;
}

export interface WindowMetrics {
  eventCount: number;
  avgTiltScore: number;
  messageEvents: number;
  commandEvents: number;
  tipEvents: number;
  avgMessageLength: number;
}

export interface TiltComparisonMetrics {
  last1h: WindowMetrics;
  baseline24h: WindowMetrics;
  ratios: {
    eventCount: number;
    avgTiltScore: number;
  };
}

export interface InterventionDecision {
  user_id: string;
  severity: InterventionSeverity;
  should_trigger_intervention: boolean;
  action: InterventionAction;
  reason_codes: string[];
  metrics: TiltComparisonMetrics;
  thresholds: {
    high_tilt_ratio: number;
    medium_tilt_ratio: number;
    high_event_spike_ratio: number;
  };
}

/**
 * Builds a single ES|QL query that compares a user's recent 1-hour activity
 * against a 24-hour baseline window (excluding the most recent hour).
 */
export function buildTiltComparisonEsql(userId: string): string {
  const safeUserId = userId.replace(/"/g, '\\"');

  return `
FROM ${TELEMETRY_INDEX}
| WHERE user_id == "${safeUserId}" AND @timestamp >= NOW() - 25 hours
| EVAL window = CASE(
    @timestamp >= NOW() - 1 hour, "last_1h",
    @timestamp < NOW() - 1 hour AND @timestamp >= NOW() - 25 hours, "baseline_24h",
    "drop"
  )
| WHERE window != "drop"
| EVAL event_kind = CASE(
    event_type == "message" OR action == "message_sent", "message",
    event_type == "command" OR action == "command_used", "command",
    event_type == "tip" OR action == "tip_sent" OR action == "tip_received", "tip",
    "other"
  )
| STATS
    event_count = COUNT(*),
    avg_tilt_score = AVG(tilt_score),
    message_events = COUNT(*) WHERE event_kind == "message",
    command_events = COUNT(*) WHERE event_kind == "command",
    tip_events = COUNT(*) WHERE event_kind == "tip",
    avg_message_length = AVG(message_length)
  BY window
| SORT window ASC
`.trim();
}

function toWindowMetrics(): WindowMetrics {
  return {
    eventCount: 0,
    avgTiltScore: 0,
    messageEvents: 0,
    commandEvents: 0,
    tipEvents: 0,
    avgMessageLength: 0,
  };
}

/**
 * Maps ES|QL JSON output into typed metrics for last_1h vs baseline_24h.
 */
export function parseTiltComparisonResponse(response: EsqlJsonResponse): TiltComparisonMetrics {
  const result: TiltComparisonMetrics = {
    last1h: toWindowMetrics(),
    baseline24h: toWindowMetrics(),
    ratios: {
      eventCount: 0,
      avgTiltScore: 0,
    },
  };

  const columns = response.columns ?? [];
  const rows = response.rows ?? [];

  for (const row of rows) {
    const mapped = Object.fromEntries(columns.map((c, i) => [c.name, row[i]]));
    const window = String(mapped.window ?? '');
    const target = window === 'last_1h' ? result.last1h : window === 'baseline_24h' ? result.baseline24h : null;
    if (!target) continue;

    target.eventCount = Number(mapped.event_count ?? 0);
    target.avgTiltScore = Number(mapped.avg_tilt_score ?? 0);
    target.messageEvents = Number(mapped.message_events ?? 0);
    target.commandEvents = Number(mapped.command_events ?? 0);
    target.tipEvents = Number(mapped.tip_events ?? 0);
    target.avgMessageLength = Number(mapped.avg_message_length ?? 0);
  }

  const safeBaselineTilt = Math.max(result.baseline24h.avgTiltScore, 1);
  const safeBaselineEvents = Math.max(result.baseline24h.eventCount, 1);

  result.ratios.avgTiltScore = result.last1h.avgTiltScore / safeBaselineTilt;
  result.ratios.eventCount = result.last1h.eventCount / safeBaselineEvents;

  return result;
}

/**
 * Rule set:
 * - HIGH when 1h avg tilt >= 200% of baseline OR event-count spike >= 300%
 * - MEDIUM when 1h avg tilt >= 150% OR event-count spike >= 200%
 * - LOW when 1h avg tilt >= 120%
 */
export function evaluateInterventionDecision(
  userId: string,
  metrics: TiltComparisonMetrics,
): InterventionDecision {
  const THRESHOLDS = {
    high_tilt_ratio: 2.0,
    medium_tilt_ratio: 1.5,
    low_tilt_ratio: 1.2,
    high_event_spike_ratio: 3.0,
    medium_event_spike_ratio: 2.0,
  };

  const reasons: string[] = [];
  const tiltRatio = metrics.ratios.avgTiltScore;
  const eventRatio = metrics.ratios.eventCount;

  if (tiltRatio >= THRESHOLDS.high_tilt_ratio) {
    reasons.push('TILT_SCORE_SPIKE_200_PERCENT');
  } else if (tiltRatio >= THRESHOLDS.medium_tilt_ratio) {
    reasons.push('TILT_SCORE_SPIKE_150_PERCENT');
  } else if (tiltRatio >= THRESHOLDS.low_tilt_ratio) {
    reasons.push('TILT_SCORE_ELEVATED_120_PERCENT');
  }

  if (eventRatio >= THRESHOLDS.high_event_spike_ratio) {
    reasons.push('EVENT_COUNT_SPIKE_300_PERCENT');
  } else if (eventRatio >= THRESHOLDS.medium_event_spike_ratio) {
    reasons.push('EVENT_COUNT_SPIKE_200_PERCENT');
  }

  let severity: InterventionSeverity = 'NONE';
  let action: InterventionAction = 'none';

  if (
    tiltRatio >= THRESHOLDS.high_tilt_ratio ||
    eventRatio >= THRESHOLDS.high_event_spike_ratio
  ) {
    severity = 'HIGH';
    action = 'send_dm_intervention';
  } else if (
    tiltRatio >= THRESHOLDS.medium_tilt_ratio ||
    eventRatio >= THRESHOLDS.medium_event_spike_ratio
  ) {
    severity = 'MEDIUM';
    action = 'send_dm_intervention';
  } else if (tiltRatio >= THRESHOLDS.low_tilt_ratio) {
    severity = 'LOW';
    action = 'deterministic_message';
  }

  return {
    user_id: userId,
    severity,
    should_trigger_intervention: action === 'send_dm_intervention',
    action,
    reason_codes: reasons,
    metrics,
    thresholds: {
      high_tilt_ratio: THRESHOLDS.high_tilt_ratio,
      medium_tilt_ratio: THRESHOLDS.medium_tilt_ratio,
      high_event_spike_ratio: THRESHOLDS.high_event_spike_ratio,
    },
  };
}

/**
 * End-to-end helper for retrieval + evaluation.
 */
export async function runReasoningAndRetrieval(
  client: ESClient,
  userId: string,
): Promise<InterventionDecision> {
  const query = buildTiltComparisonEsql(userId);
  const response = (await client.esql.query({
    query,
    format: 'json',
  })) as EsqlJsonResponse;

  const metrics = parseTiltComparisonResponse(response);
  return evaluateInterventionDecision(userId, metrics);
}

