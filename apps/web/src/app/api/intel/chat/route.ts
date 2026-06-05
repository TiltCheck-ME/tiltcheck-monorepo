/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */

import { NextRequest, NextResponse } from 'next/server';
import { getIntelAgent } from '@/lib/intel/agent';
import { checkIntelRateLimit, getClientIp } from '@/lib/intel/rate-limit';
import { getServerAuthContext } from '@/lib/intel/server-auth';

const ANONYMOUS_LIMIT = 20;
const AUTH_LIMIT = 60;
const WINDOW_MS = 60 * 60 * 1000;

type ChatPayload = {
  sessionId?: unknown;
  message?: unknown;
};

function normalizeMessage(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 500) {
    return null;
  }
  return trimmed;
}

export async function POST(request: NextRequest) {
  let payload: ChatPayload;

  try {
    payload = (await request.json()) as ChatPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const message = normalizeMessage(payload.message);
  if (!message) {
    return NextResponse.json({ error: 'Message is required (max 500 chars).' }, { status: 400 });
  }

  const auth = await getServerAuthContext();
  const ip = getClientIp(request);
  const rateKey = auth.isAuthenticated ? `auth:${auth.discordId}` : `ip:${ip}`;
  const limit = auth.isAuthenticated ? AUTH_LIMIT : ANONYMOUS_LIMIT;
  const rate = checkIntelRateLimit(rateKey, limit, WINDOW_MS);

  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit hit. Slow down — the audit head is not a slot machine.',
        resetAt: rate.resetAt,
      },
      { status: 429 },
    );
  }

  const agent = getIntelAgent();
  const result = await agent.processMessage({
    message,
    context: {
      isAuthenticated: auth.isAuthenticated,
      discordId: auth.discordId,
    },
  });

  return NextResponse.json({
    ...result,
    rateLimit: {
      remaining: rate.remaining,
      resetAt: rate.resetAt,
    },
  });
}
