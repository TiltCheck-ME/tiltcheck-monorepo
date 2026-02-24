/**
 * Elastic Telemetry Service
 *
 * Indexes real-time user behavior events into Elasticsearch for
 * time-series tilt detection via the Elastic AI Agent.
 *
 * Index: tiltcheck-telemetry
 */

import { Client as ESClient } from '@elastic/elasticsearch';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActionType =
  | 'message_sent'
  | 'command_used'
  | 'tip_sent'
  | 'tip_received'
  | 'wallet_checked'
  | 'cooldown_triggered'
  | 'tilt_detected'
  | 'lockvault_activated'
  | 'report_filed';

export interface TelemetryEvent {
  '@timestamp': string;         // ISO-8601
  user_id: string;
  guild_id?: string;
  channel_id?: string;
  action: ActionType;
  /** Normalised sentiment score -1.0 (negative) → +1.0 (positive) */
  sentiment?: number;
  /** Raw tilt score 0-100 if available */
  tilt_score?: number;
  /** Tip / transaction amount in SOL */
  amount_sol?: number;
  /** True when the action happened inside a DM */
  is_dm: boolean;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------

let _client: ESClient | null = null;
const INDEX = 'tiltcheck-telemetry';

function getClient(): ESClient | null {
  if (_client) return _client;

  const url = process.env.ELASTIC_URL;
  const apiKey = process.env.ELASTIC_API_KEY;

  if (!url || !apiKey) {
    // Telemetry is optional — bot works fine without it
    return null;
  }

  _client = new ESClient({
    node: url,
    auth: { apiKey },
    tls: { rejectUnauthorized: true },
  });

  return _client;
}

// ---------------------------------------------------------------------------
// Ensure the index mapping exists (run once at startup)
// ---------------------------------------------------------------------------

export async function ensureTelemetryIndex(): Promise<void> {
  const client = getClient();
  if (!client) return;

  try {
    const exists = await client.indices.exists({ index: INDEX });
    if (exists) return;

    await client.indices.create({
      index: INDEX,
      mappings: {
        properties: {
          '@timestamp':  { type: 'date' },
          user_id:       { type: 'keyword' },
          guild_id:      { type: 'keyword' },
          channel_id:    { type: 'keyword' },
          action:        { type: 'keyword' },
          sentiment:     { type: 'float' },
          tilt_score:    { type: 'float' },
          amount_sol:    { type: 'double' },
          is_dm:         { type: 'boolean' },
          metadata:      { type: 'object', dynamic: true },
        },
      },
      // Note: serverless Elastic does not accept shard/replica settings
    });

    console.log(`[Elastic] ✅ Index "${INDEX}" created`);
  } catch (err) {
    console.error('[Elastic] Failed to ensure index:', err);
  }
}

// ---------------------------------------------------------------------------
// Core ingest function
// ---------------------------------------------------------------------------

export async function ingestEvent(
  event: Omit<TelemetryEvent, '@timestamp'>
): Promise<void> {
  const client = getClient();
  if (!client) return;   // silently skip when Elastic is not configured

  const doc: TelemetryEvent = {
    '@timestamp': new Date().toISOString(),
    ...event,
  };

  try {
    await client.index({ index: INDEX, document: doc });
  } catch (err) {
    // Never throw — telemetry must never crash the bot
    console.error('[Elastic] Failed to index event:', err);
  }
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

export function trackMessageEvent(opts: {
  userId: string;
  guildId?: string;
  channelId?: string;
  sentiment?: number;
  isDM?: boolean;
}): Promise<void> {
  return ingestEvent({
    user_id: opts.userId,
    guild_id: opts.guildId,
    channel_id: opts.channelId,
    action: 'message_sent',
    sentiment: opts.sentiment,
    is_dm: opts.isDM ?? false,
  });
}

export function trackCommandEvent(opts: {
  userId: string;
  guildId?: string;
  commandName: string;
  isDM?: boolean;
}): Promise<void> {
  return ingestEvent({
    user_id: opts.userId,
    guild_id: opts.guildId,
    action: 'command_used',
    is_dm: opts.isDM ?? false,
    metadata: { command: opts.commandName },
  });
}

export function trackTipEvent(opts: {
  senderId: string;
  receiverId: string;
  guildId?: string;
  amountSol: number;
}): Promise<void> {
  // Index two events — one for each side — so per-user queries work naturally
  return Promise.all([
    ingestEvent({
      user_id: opts.senderId,
      guild_id: opts.guildId,
      action: 'tip_sent',
      amount_sol: opts.amountSol,
      is_dm: false,
      metadata: { counterpart: opts.receiverId },
    }),
    ingestEvent({
      user_id: opts.receiverId,
      guild_id: opts.guildId,
      action: 'tip_received',
      amount_sol: opts.amountSol,
      is_dm: false,
      metadata: { counterpart: opts.senderId },
    }),
  ]).then(() => undefined);
}

export function trackTiltDetected(opts: {
  userId: string;
  tiltScore: number;
  signals: string[];
}): Promise<void> {
  return ingestEvent({
    user_id: opts.userId,
    action: 'tilt_detected',
    tilt_score: opts.tiltScore,
    is_dm: true,
    metadata: { signals: opts.signals },
  });
}
