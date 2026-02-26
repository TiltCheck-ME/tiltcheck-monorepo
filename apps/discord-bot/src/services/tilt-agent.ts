/**
 * Tilt Agent Service
 *
 * Runs retrieval + reasoning for user tilt detection and returns
 * intervention-ready messages for the DM flow.
 */

import { Client as ESClient } from '@elastic/elasticsearch';
import {
  runReasoningAndRetrieval,
  type InterventionDecision,
} from './reasoning-retrieval.js';
import { getStateTopicStatus } from './regulations-retrieval.js';
import {
  clearTiltAgentContext,
  loadTiltAgentContext,
  saveTiltAgentContext,
} from './tilt-agent-context-store.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------


export interface TiltAgentContext {
  stateCode?: string;
  regulationTopic?: string;
}
export interface TiltAnalysis {
  userId: string;
  isActing: boolean;
  severity: 'low' | 'medium' | 'high';
  message: string;
  metrics: {
    messagesLastHour: number;
    messagesBaseline: number;
    tipsLastHour: number;
    tipsBaseline: number;
    avgSentimentLastHour: number;
    avgSentimentBaseline: number;
    maxTiltScoreLastHour: number;
  };
}

// ---------------------------------------------------------------------------
// Legacy ES|QL fallback queries (kept for compatibility)
// ---------------------------------------------------------------------------

function buildLegacyTiltQuery(userId: string): string {
  return `
    FROM tiltcheck-telemetry
    | WHERE user_id == "${userId}"
      AND @timestamp >= NOW() - 1 hour
    | STATS
        msgs          = COUNT(*) WHERE action == "message_sent",
        avg_sentiment = AVG(sentiment),
        tips_sent     = COUNT(*) WHERE action == "tip_sent",
        max_tilt      = MAX(tilt_score)
  `.trim();
}

function buildLegacyBaselineQuery(userId: string): string {
  return `
    FROM tiltcheck-telemetry
    | WHERE user_id == "${userId}"
      AND @timestamp >= NOW() - 24 hours
    | STATS
        msgs_24h          = COUNT(*) WHERE action == "message_sent",
        avg_sentiment_24h = AVG(sentiment),
        tips_24h          = COUNT(*) WHERE action == "tip_sent"
  `.trim();
}

async function runEsql(
  client: ESClient,
  query: string,
): Promise<Record<string, number | null>> {
  const resp = await client.esql.query({ query, format: 'json' });
  const columns: Array<{ name: string }> = (resp as any).columns ?? [];
  const rows: Array<Array<number | null>> = (resp as any).rows ?? [];

  if (!rows.length) return {};

  const row = rows[0];
  return Object.fromEntries(columns.map((c, i) => [c.name, row[i] ?? null]));
}

// ---------------------------------------------------------------------------
// Rule/message helpers
// ---------------------------------------------------------------------------

function scoreActivity(metrics: TiltAnalysis['metrics']): {
  severity: TiltAnalysis['severity'];
  flags: string[];
} {
  const flags: string[] = [];

  const msgRatio =
    metrics.messagesBaseline > 0
      ? metrics.messagesLastHour / metrics.messagesBaseline
      : 0;

  const tipRatio =
    metrics.tipsBaseline > 0
      ? metrics.tipsLastHour / metrics.tipsBaseline
      : 0;

  const sentimentDrop =
    metrics.avgSentimentBaseline - metrics.avgSentimentLastHour;

  if (msgRatio > 3) {
    flags.push(`message volume is ${msgRatio.toFixed(1)}x your normal rate`);
  }
  if (tipRatio > 2) {
    flags.push(`tip frequency is ${tipRatio.toFixed(1)}x your normal rate`);
  }
  if (sentimentDrop > 0.4) {
    flags.push(
      `your tone has dropped significantly (${sentimentDrop.toFixed(2)} shift)`,
    );
  }
  if (metrics.maxTiltScoreLastHour >= 70) {
    flags.push(`tilt score hit ${metrics.maxTiltScoreLastHour}/100`);
  }

  let severity: TiltAnalysis['severity'] = 'low';
  if (flags.length >= 3 || metrics.maxTiltScoreLastHour >= 85) {
    severity = 'high';
  } else if (flags.length >= 2 || metrics.maxTiltScoreLastHour >= 60) {
    severity = 'medium';
  }

  return { severity, flags };
}

function buildMessage(
  severity: TiltAnalysis['severity'],
  flags: string[],
): string {
  if (!flags.length) {
    return 'You are looking stable right now. No clear tilt patterns detected.';
  }

  const intro: Record<TiltAnalysis['severity'], string> = {
    low: 'Quick heads-up:',
    medium: 'Pause for a second.',
    high: 'TiltCheck stepping in.',
  };

  const outro: Record<TiltAnalysis['severity'], string> = {
    low: 'Keep an eye on this pattern.',
    medium: 'Take a 10 minute break before the next action.',
    high: 'Step away now and use /lockvault if you need a hard stop.',
  };

  const flagList = flags.map((f) => `- ${f}`).join('\n');
  return `${intro[severity]}\n\nI am seeing the following:\n${flagList}\n\n${outro[severity]}`;
}

async function callElasticAgent(
  metrics: TiltAnalysis['metrics'],
  flags: string[],
): Promise<string | null> {
  const endpoint = process.env.ELASTIC_AGENT_ENDPOINT;
  const apiKey = process.env.ELASTIC_API_KEY;

  if (!endpoint || !apiKey || !flags.length) return null;

  const systemPrompt = `You are TiltCheck, an accountability buddy for online gamblers.
Write a short Discord DM (3-5 sentences) that acknowledges the concrete anomalies,
asks them to pause, and avoids moralizing.`;

  try {
    const resp = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ApiKey ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify({ metrics, flags }) },
        ],
        max_tokens: 200,
      }),
    });

    if (!resp.ok) return null;
    const data = (await resp.json()) as any;
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

function reasonCodeToText(code: string): string {
  const map: Record<string, string> = {
    TILT_SCORE_SPIKE_200_PERCENT: 'tilt score jumped to over 200% of baseline',
    TILT_SCORE_SPIKE_150_PERCENT: 'tilt score jumped to over 150% of baseline',
    TILT_SCORE_ELEVATED_120_PERCENT: 'tilt score is elevated above baseline',
    EVENT_COUNT_SPIKE_300_PERCENT: 'activity volume spiked to over 300% of baseline',
    EVENT_COUNT_SPIKE_200_PERCENT: 'activity volume spiked to over 200% of baseline',
  };

  return map[code] ?? code;
}

function mapDecisionToSeverity(
  severity: InterventionDecision['severity'],
): TiltAnalysis['severity'] {
  if (severity === 'HIGH') return 'high';
  if (severity === 'MEDIUM') return 'medium';
  return 'low';
}

function mapDecisionToMetrics(decision: InterventionDecision): TiltAnalysis['metrics'] {
  return {
    messagesLastHour: decision.metrics.last1h.messageEvents,
    messagesBaseline: decision.metrics.baseline24h.messageEvents / 24,
    tipsLastHour: decision.metrics.last1h.tipEvents,
    tipsBaseline: decision.metrics.baseline24h.tipEvents / 24,
    avgSentimentLastHour: 0,
    avgSentimentBaseline: 0,
    maxTiltScoreLastHour: decision.metrics.last1h.avgTiltScore,
  };
}

function applyRegulatoryGuardrail(
  analysis: TiltAnalysis,
  status: string,
  stateCode: string,
  topic: string,
): TiltAnalysis {
  if (!analysis.isActing) return analysis;

  const normalized = status.toLowerCase();
  if (normalized !== 'prohibited' && normalized !== 'restricted') {
    return analysis;
  }

  const guardrailLine =
    normalized === 'prohibited'
      ? `Regulatory note: ${topic} appears prohibited in ${stateCode}.`
      : `Regulatory note: ${topic} appears restricted in ${stateCode}.`;

  return {
    ...analysis,
    severity: 'high',
    message: `${analysis.message}\n\n${guardrailLine} Use compliance-safe options only.`,
  };
}

async function enrichWithRegulations(
  client: ESClient,
  analysis: TiltAnalysis,
  context?: TiltAgentContext,
): Promise<TiltAnalysis> {
  const stateCode = context?.stateCode?.trim().toUpperCase();
  const topic = (context?.regulationTopic?.trim().toLowerCase() || 'igaming');

  if (!stateCode || !analysis.isActing) return analysis;

  try {
    const rows = await getStateTopicStatus(client, stateCode, topic);
    const status = rows[0]?.status;
    if (!status) return analysis;

    return applyRegulatoryGuardrail(analysis, status, stateCode, topic);
  } catch (err) {
    console.warn(`[TiltAgent] regulation enrichment failed for ${analysis.userId}:`, err);
    return analysis;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

let _esClient: ESClient | null = null;

function getEsClient(): ESClient | null {
  if (_esClient) return _esClient;

  const url = process.env.ELASTIC_URL;
  const apiKey = process.env.ELASTIC_API_KEY;
  if (!url || !apiKey) return null;

  _esClient = new ESClient({ node: url, auth: { apiKey } });
  return _esClient;
}

async function analyseUserLegacy(client: ESClient, userId: string): Promise<TiltAnalysis> {
  const noop: TiltAnalysis = {
    userId,
    isActing: false,
    severity: 'low',
    message: '',
    metrics: {
      messagesLastHour: 0,
      messagesBaseline: 0,
      tipsLastHour: 0,
      tipsBaseline: 0,
      avgSentimentLastHour: 0,
      avgSentimentBaseline: 0,
      maxTiltScoreLastHour: 0,
    },
  };

  const [recent, baseline] = await Promise.all([
    runEsql(client, buildLegacyTiltQuery(userId)),
    runEsql(client, buildLegacyBaselineQuery(userId)),
  ]);

  const metrics: TiltAnalysis['metrics'] = {
    messagesLastHour: (recent.msgs ?? 0) as number,
    messagesBaseline: ((baseline.msgs_24h ?? 0) as number) / 24,
    tipsLastHour: (recent.tips_sent ?? 0) as number,
    tipsBaseline: ((baseline.tips_24h ?? 0) as number) / 24,
    avgSentimentLastHour: (recent.avg_sentiment ?? 0) as number,
    avgSentimentBaseline: (baseline.avg_sentiment_24h ?? 0) as number,
    maxTiltScoreLastHour: (recent.max_tilt ?? 0) as number,
  };

  const { severity, flags } = scoreActivity(metrics);
  if (!flags.length) return noop;

  const agentMsg = await callElasticAgent(metrics, flags);
  const message = agentMsg ?? buildMessage(severity, flags);

  return { userId, isActing: true, severity, message, metrics };
}

/**
 * Primary path: reasoning-retrieval module.
 * Fallback path: legacy query + scoring if the new retrieval query fails.
 */
export async function analyseUser(userId: string, context?: TiltAgentContext): Promise<TiltAnalysis> {
  const noop: TiltAnalysis = {
    userId,
    isActing: false,
    severity: 'low',
    message: '',
    metrics: {
      messagesLastHour: 0,
      messagesBaseline: 0,
      tipsLastHour: 0,
      tipsBaseline: 0,
      avgSentimentLastHour: 0,
      avgSentimentBaseline: 0,
      maxTiltScoreLastHour: 0,
    },
  };

  const client = getEsClient();
  if (!client) return noop;

  try {
    const decision = await runReasoningAndRetrieval(client, userId);

    if (decision.action === 'none') {
      return noop;
    }

    const severity = mapDecisionToSeverity(decision.severity);
    const metrics = mapDecisionToMetrics(decision);
    const flags = decision.reason_codes.map(reasonCodeToText);

    const agentMsg =
      decision.action === 'send_dm_intervention'
        ? await callElasticAgent(metrics, flags)
        : null;

    const message = agentMsg ?? buildMessage(severity, flags);

    const baseAnalysis: TiltAnalysis = {
      userId,
      isActing: true,
      severity,
      message,
      metrics,
    };

    return await enrichWithRegulations(client, baseAnalysis, context);
  } catch (err) {
    console.warn(
      `[TiltAgent] reasoning retrieval failed for ${userId}; using legacy fallback`,
      err,
    );

    try {
      const legacy = await analyseUserLegacy(client, userId);
      return await enrichWithRegulations(client, legacy, context);
    } catch (legacyErr) {
      console.error(`[TiltAgent] analyseUser(${userId}) failed:`, legacyErr);
      return noop;
    }
  }
}

// ---------------------------------------------------------------------------
// Periodic background scan
// ---------------------------------------------------------------------------

const SCAN_INTERVAL_MS = 5 * 60 * 1000;
const recentUsers = new Map<string, TiltAgentContext>();
const userContexts = new Map<string, TiltAgentContext>();

export function markUserActive(userId: string, context?: TiltAgentContext): void {
  const stored = userContexts.get(userId);
  const resolved = stored ?? context;
  const existing = recentUsers.get(userId) ?? {};
  recentUsers.set(userId, { ...existing, ...(resolved ?? {}) });

  if (!stored) {
    void hydrateUserTiltAgentContext(userId);
  }
}

export function setUserTiltAgentContext(
  userId: string,
  context: TiltAgentContext,
): TiltAgentContext {
  const normalized: TiltAgentContext = {
    stateCode: context.stateCode?.trim().toUpperCase(),
    regulationTopic: context.regulationTopic?.trim().toLowerCase(),
  };

  userContexts.set(userId, normalized);

  const existingRecent = recentUsers.get(userId) ?? {};
  recentUsers.set(userId, { ...existingRecent, ...normalized });

  void saveTiltAgentContext(userId, normalized);
  return normalized;
}

export function getUserTiltAgentContext(userId: string): TiltAgentContext | undefined {
  return userContexts.get(userId);
}

export function clearUserTiltAgentContext(userId: string): void {
  userContexts.delete(userId);
  recentUsers.delete(userId);
  void clearTiltAgentContext(userId);
}

export async function hydrateUserTiltAgentContext(userId: string): Promise<TiltAgentContext | undefined> {
  const existing = userContexts.get(userId);
  if (existing) return existing;

  const loaded = await loadTiltAgentContext(userId);
  if (!loaded) return undefined;

  userContexts.set(userId, loaded);
  const pending = recentUsers.get(userId) ?? {};
  recentUsers.set(userId, { ...pending, ...loaded });
  return loaded;
}

export function startTiltAgentLoop(
  onIntervene: (
    userId: string,
    message: string,
    severity: TiltAnalysis['severity'],
  ) => Promise<void>,
): NodeJS.Timeout {
  const timer = setInterval(async () => {
    const batch = [...recentUsers.entries()];
    recentUsers.clear();

    for (const [userId, context] of batch) {
      const analysis = await analyseUser(userId, context);
      if (analysis.isActing) {
        await onIntervene(userId, analysis.message, analysis.severity).catch(
          (err) =>
            console.error(`[TiltAgent] onIntervene(${userId}) failed:`, err),
        );
      }
    }
  }, SCAN_INTERVAL_MS);

  console.log('[TiltAgent] background scan loop started (every 5 min)');
  return timer;
}








