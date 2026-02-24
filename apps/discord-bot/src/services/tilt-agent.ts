/**
 * Tilt Agent Service
 *
 * Queries Elasticsearch via ES|QL to detect tilt patterns, then
 * calls the Elastic AI Agent (or falls back to direct rule-based
 * analysis) to produce a human-readable intervention message.
 *
 * The agent is invoked:
 *  1. Every 5 minutes for users who have been active recently
 *  2. Immediately when a high-risk command fires (e.g. /lockvault)
 */

import { Client as ESClient } from '@elastic/elasticsearch';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TiltAnalysis {
  userId: string;
  isActing: boolean;           // true when intervention should be sent
  severity: 'low' | 'medium' | 'high';
  message: string;             // ready-to-send Discord DM text
  metrics: {
    messagesLastHour: number;
    messagesBaseline: number;  // hourly avg over past 24 h
    tipsLastHour: number;
    tipsBaseline: number;
    avgSentimentLastHour: number;
    avgSentimentBaseline: number;
    maxTiltScoreLastHour: number;
  };
}

// ---------------------------------------------------------------------------
// ES|QL queries
// ---------------------------------------------------------------------------

/**
 * Returns a compact behavioural summary for a single user:
 *   - message count + avg sentiment for the last 60 min
 *   - same metrics as a rolling 24 h baseline (divided to hourly avg)
 *   - total SOL tipped in the last 60 min
 *   - highest tilt_score recorded in the last 60 min
 */
function buildTiltQuery(userId: string): string {
  // ES|QL does not support subqueries, so we run two queries and merge
  // in application code. This is the 60-min window query.
  return `
    FROM tiltcheck-telemetry
    | WHERE user_id == "${userId}"
      AND @timestamp >= NOW() - 1 hour
    | STATS
        msgs          = COUNT(*) WHERE action == "message_sent",
        avg_sentiment = AVG(sentiment),
        tips_sent     = COUNT(*) WHERE action == "tip_sent",
        sol_out       = SUM(amount_sol) WHERE action == "tip_sent",
        max_tilt      = MAX(tilt_score)
  `.trim();
}

function buildBaselineQuery(userId: string): string {
  // 24 h window — divide counts by 24 in app code to get hourly baseline
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

// ---------------------------------------------------------------------------
// ES|QL execution helper
// ---------------------------------------------------------------------------

async function runEsql(
  client: ESClient,
  query: string
): Promise<Record<string, number | null>> {
  const resp = await client.esql.query({ query, format: 'json' });

  // ES|QL returns { columns: [...], rows: [[...]] }
  const columns: Array<{ name: string }> = (resp as any).columns ?? [];
  const rows: Array<Array<number | null>> = (resp as any).rows ?? [];

  if (!rows.length) return {};

  const row = rows[0];
  return Object.fromEntries(columns.map((c, i) => [c.name, row[i] ?? null]));
}

// ---------------------------------------------------------------------------
// Tilt scoring logic (rule-based fallback / complement to AI agent)
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

  if (msgRatio > 3) flags.push(`message volume is ${msgRatio.toFixed(1)}x your normal rate`);
  if (tipRatio > 2) flags.push(`tip frequency is ${tipRatio.toFixed(1)}x your normal rate`);
  if (sentimentDrop > 0.4) flags.push(`your tone has dropped significantly (${sentimentDrop.toFixed(2)} shift)`);
  if (metrics.maxTiltScoreLastHour >= 70) flags.push(`tilt score hit ${metrics.maxTiltScoreLastHour}/100`);

  let severity: TiltAnalysis['severity'] = 'low';
  if (flags.length >= 3 || metrics.maxTiltScoreLastHour >= 85) severity = 'high';
  else if (flags.length >= 2 || metrics.maxTiltScoreLastHour >= 60) severity = 'medium';

  return { severity, flags };
}

function buildMessage(
  severity: TiltAnalysis['severity'],
  flags: string[]
): string {
  if (!flags.length) {
    return "You're looking good. No signs of tilt detected right now.";
  }

  const intro: Record<TiltAnalysis['severity'], string> = {
    low:    "👀 Just a heads-up:",
    medium: "⚠️ Hey, pump the brakes for a second.",
    high:   "🛑 TiltCheck stepping in.",
  };

  const outro: Record<TiltAnalysis['severity'], string> = {
    low:    "Keep an eye on it.",
    medium: "Take 10 minutes away from the screen. Seriously.",
    high:   "Step away now. Use `/lockvault` if you need a hard stop.",
  };

  const flagList = flags.map(f => `• ${f}`).join('\n');
  return `${intro[severity]}\n\nI'm seeing some patterns worth flagging:\n${flagList}\n\n${outro[severity]}`;
}

// ---------------------------------------------------------------------------
// Optional: call Elastic AI assistant via chat completions endpoint
// ---------------------------------------------------------------------------

async function callElasticAgent(
  metrics: TiltAnalysis['metrics'],
  flags: string[]
): Promise<string | null> {
  const endpoint = process.env.ELASTIC_AGENT_ENDPOINT;
  const apiKey   = process.env.ELASTIC_API_KEY;

  if (!endpoint || !apiKey || !flags.length) return null;

  const systemPrompt = `You are TiltCheck, a blunt, non-judgmental accountability buddy for online gamblers.
You receive a JSON summary of a user's recent activity and a list of anomaly flags.
Write a SHORT (3–5 sentence) Discord DM that:
- Acknowledges the specific flags
- Tells them to take a break
- Does NOT lecture or moralize
- Uses plain language, no jargon`;

  const userContent = JSON.stringify({ metrics, flags });

  try {
    const resp = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ApiKey ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',   // swap for whatever model is wired to your Elastic deployment
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userContent },
        ],
        max_tokens: 200,
      }),
    });

    if (!resp.ok) return null;
    const data = await resp.json() as any;
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

let _esClient: ESClient | null = null;

function getEsClient(): ESClient | null {
  if (_esClient) return _esClient;

  const url    = process.env.ELASTIC_URL;
  const apiKey = process.env.ELASTIC_API_KEY;
  if (!url || !apiKey) return null;

  _esClient = new ESClient({ node: url, auth: { apiKey } });
  return _esClient;
}

/**
 * Analyse a single user's recent behaviour and return an intervention
 * decision + message. Safe to call frequently — returns isActing=false
 * when Elastic is not configured or the user shows no signs of tilt.
 */
export async function analyseUser(userId: string): Promise<TiltAnalysis> {
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
    const [recent, baseline] = await Promise.all([
      runEsql(client, buildTiltQuery(userId)),
      runEsql(client, buildBaselineQuery(userId)),
    ]);

    const metrics: TiltAnalysis['metrics'] = {
      messagesLastHour:       (recent.msgs              ?? 0) as number,
      messagesBaseline:       ((baseline.msgs_24h ?? 0) as number) / 24,
      tipsLastHour:           (recent.tips_sent          ?? 0) as number,
      tipsBaseline:           ((baseline.tips_24h ?? 0)  as number) / 24,
      avgSentimentLastHour:   (recent.avg_sentiment       ?? 0) as number,
      avgSentimentBaseline:   (baseline.avg_sentiment_24h ?? 0) as number,
      maxTiltScoreLastHour:   (recent.max_tilt            ?? 0) as number,
    };

    const { severity, flags } = scoreActivity(metrics);
    const isActing = flags.length > 0;

    // Try the AI agent first; fall back to rule-based message
    const agentMsg = isActing
      ? await callElasticAgent(metrics, flags)
      : null;

    const message = agentMsg ?? buildMessage(severity, flags);

    return { userId, isActing, severity, message, metrics };
  } catch (err) {
    console.error(`[TiltAgent] analyseUser(${userId}) failed:`, err);
    return noop;
  }
}

// ---------------------------------------------------------------------------
// Periodic background scan
// ---------------------------------------------------------------------------

const SCAN_INTERVAL_MS = 5 * 60 * 1000;   // 5 minutes
const recentUsers = new Set<string>();      // populated by ingestEvent callers

export function markUserActive(userId: string): void {
  recentUsers.add(userId);
}

/**
 * Start the background scan loop.
 * Pass `onIntervene` — the bot will call it with the DM text whenever
 * TiltCheck decides to intervene.
 */
export function startTiltAgentLoop(
  onIntervene: (userId: string, message: string, severity: TiltAnalysis['severity']) => Promise<void>
): NodeJS.Timeout {
  const timer = setInterval(async () => {
    const batch = [...recentUsers];
    recentUsers.clear();

    for (const userId of batch) {
      const analysis = await analyseUser(userId);
      if (analysis.isActing) {
        await onIntervene(userId, analysis.message, analysis.severity).catch(
          err => console.error(`[TiltAgent] onIntervene(${userId}) failed:`, err)
        );
      }
    }
  }, SCAN_INTERVAL_MS);

  console.log('[TiltAgent] ✅ Background scan loop started (every 5 min)');
  return timer;
}
