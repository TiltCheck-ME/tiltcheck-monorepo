/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-23 */

import { NextRequest, NextResponse } from 'next/server';

const allowedEventTypes = new Set(['page_view', 'cta_click']);

type FunnelEventPayload = {
  type?: unknown;
  step?: unknown;
  source?: unknown;
  label?: unknown;
  href?: unknown;
  path?: unknown;
  sessionId?: unknown;
  metadata?: unknown;
};

function normalizeString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function normalizeMetadata(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([key, entryValue]) => {
      const normalizedKey = normalizeString(key, 64);
      const normalizedValue = normalizeString(String(entryValue), 160);
      if (!normalizedKey || !normalizedValue) {
        return null;
      }

      return [normalizedKey, normalizedValue] as const;
    })
    .filter((entry): entry is readonly [string, string] => entry !== null);

  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

export async function POST(request: NextRequest) {
  let payload: FunnelEventPayload;

  try {
    payload = (await request.json()) as FunnelEventPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const type = normalizeString(payload.type, 32);
  if (!type || !allowedEventTypes.has(type)) {
    return NextResponse.json({ error: 'Unsupported funnel event type.' }, { status: 400 });
  }

  const step = normalizeString(payload.step, 64);
  const source = normalizeString(payload.source, 64);
  const label = normalizeString(payload.label, 160);
  const href = normalizeString(payload.href, 512);
  const path = normalizeString(payload.path, 256);
  const sessionId = normalizeString(payload.sessionId, 128);
  const metadata = normalizeMetadata(payload.metadata);

  console.info(
    '[TiltCheck Funnel]',
    JSON.stringify({
      type,
      step,
      source,
      label,
      href,
      path,
      sessionId,
      metadata,
      receivedAt: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
    }),
  );

  return NextResponse.json({ ok: true });
}
