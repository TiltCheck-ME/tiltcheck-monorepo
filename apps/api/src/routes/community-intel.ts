import crypto from 'node:crypto';
import type { Request } from 'express';
import { Router } from 'express';
import { query } from '@tiltcheck/db';

const router = Router();

type IngestMessage = {
  messageId?: string;
  timestamp?: string;
  author?: string;
  content?: string;
  hasKeyword?: boolean;
};

type IngestBody = {
  source?: string;
  channelUrl?: string;
  provider?: string;
  model?: string;
  messageCount?: number;
  reportMarkdown?: string;
  painPoints?: string[];
  frictionMoments?: string[];
  safetySignals?: string[];
  communityNeeds?: string[];
  opportunities?: string[];
  rangeStart?: string | null;
  rangeEnd?: string | null;
  messages?: IngestMessage[];
  metadata?: Record<string, unknown>;
};

let tablesEnsured = false;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean);
}

function safeDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function secureEqual(left: string, right: string): boolean {
  const leftBuf = Buffer.from(left);
  const rightBuf = Buffer.from(right);
  if (leftBuf.length !== rightBuf.length) return false;
  return crypto.timingSafeEqual(leftBuf, rightBuf);
}

function hasValidIngestKey(req: Request): boolean {
  const expectedKey = process.env.COMMUNITY_INTEL_INGEST_KEY || '';
  if (!expectedKey) return false;

  const headerKey = req.headers['x-community-intel-key'];
  const providedHeaderKey = Array.isArray(headerKey) ? headerKey[0] : headerKey;
  if (typeof providedHeaderKey === 'string' && secureEqual(providedHeaderKey, expectedKey)) {
    return true;
  }

  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (token && secureEqual(token, expectedKey)) {
      return true;
    }
  }

  return false;
}

async function ensureTables(): Promise<void> {
  if (tablesEnsured) return;

  await query(`
    CREATE TABLE IF NOT EXISTS community_intel_reports (
      id BIGSERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      channel_url TEXT,
      provider TEXT,
      model TEXT,
      started_at TIMESTAMPTZ,
      ended_at TIMESTAMPTZ,
      message_count INTEGER NOT NULL DEFAULT 0,
      report_markdown TEXT NOT NULL,
      pain_points JSONB NOT NULL DEFAULT '[]'::jsonb,
      friction_moments JSONB NOT NULL DEFAULT '[]'::jsonb,
      safety_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
      community_needs JSONB NOT NULL DEFAULT '[]'::jsonb,
      opportunities JSONB NOT NULL DEFAULT '[]'::jsonb,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS community_intel_messages (
      id BIGSERIAL PRIMARY KEY,
      report_id BIGINT NOT NULL REFERENCES community_intel_reports(id) ON DELETE CASCADE,
      message_id TEXT,
      timestamp TIMESTAMPTZ,
      author TEXT,
      content TEXT,
      is_keyword_trigger BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_community_intel_reports_received_at
      ON community_intel_reports (received_at DESC)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_community_intel_reports_source
      ON community_intel_reports (source)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_community_intel_messages_report_id
      ON community_intel_messages (report_id)
  `);

  tablesEnsured = true;
}

router.post('/ingest', async (req, res) => {
  try {
    if (!process.env.COMMUNITY_INTEL_INGEST_KEY) {
      res.status(503).json({
        success: false,
        error: 'COMMUNITY_INTEL_INGEST_KEY is not configured on API',
      });
      return;
    }

    if (!hasValidIngestKey(req)) {
      res.status(401).json({
        success: false,
        error: 'Invalid ingest key',
      });
      return;
    }

    const body: IngestBody = req.body ?? {};
    const source = (body.source || '').trim();
    const reportMarkdown = (body.reportMarkdown || '').trim();
    const messageCount = Number(body.messageCount ?? 0);

    if (!source || !reportMarkdown) {
      res.status(400).json({
        success: false,
        error: 'source and reportMarkdown are required',
      });
      return;
    }

    if (!Number.isFinite(messageCount) || messageCount < 0) {
      res.status(400).json({
        success: false,
        error: 'messageCount must be a non-negative number',
      });
      return;
    }

    await ensureTables();

    const insertedReport = await query<{ id: number }>(
      `
      INSERT INTO community_intel_reports (
        source,
        channel_url,
        provider,
        model,
        started_at,
        ended_at,
        message_count,
        report_markdown,
        pain_points,
        friction_moments,
        safety_signals,
        community_needs,
        opportunities,
        metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb
      )
      RETURNING id
      `,
      [
        source,
        body.channelUrl || null,
        body.provider || null,
        body.model || null,
        safeDate(body.rangeStart)?.toISOString() ?? null,
        safeDate(body.rangeEnd)?.toISOString() ?? null,
        Math.floor(messageCount),
        reportMarkdown,
        JSON.stringify(asStringArray(body.painPoints)),
        JSON.stringify(asStringArray(body.frictionMoments)),
        JSON.stringify(asStringArray(body.safetySignals)),
        JSON.stringify(asStringArray(body.communityNeeds)),
        JSON.stringify(asStringArray(body.opportunities)),
        JSON.stringify(body.metadata && typeof body.metadata === 'object' ? body.metadata : {}),
      ],
    );

    const reportId = insertedReport[0]?.id;
    if (!reportId) {
      throw new Error('Failed to persist report');
    }

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const cappedMessages = messages.slice(0, 500);

    let insertedMessageCount = 0;
    for (const msg of cappedMessages) {
      const text = typeof msg.content === 'string' ? msg.content.trim() : '';
      if (!text) continue;

      await query(
        `
        INSERT INTO community_intel_messages (
          report_id,
          message_id,
          timestamp,
          author,
          content,
          is_keyword_trigger
        ) VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          reportId,
          msg.messageId || null,
          safeDate(msg.timestamp)?.toISOString() ?? null,
          (msg.author || '').trim() || null,
          text.slice(0, 4000),
          Boolean(msg.hasKeyword),
        ],
      );
      insertedMessageCount += 1;
    }

    res.status(201).json({
      success: true,
      reportId,
      messagesStored: insertedMessageCount,
    });
  } catch (err) {
    console.error('[CommunityIntel] ingest failed:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to ingest community intelligence',
    });
  }
});

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    route: 'community-intel',
    timestamp: new Date().toISOString(),
  });
});

export { router as communityIntelRouter };
