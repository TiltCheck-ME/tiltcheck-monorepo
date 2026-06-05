/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */

import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { IntelBlock } from '@tiltcheck/intel-agent';
import { saveIntelShareSnapshot } from '@/lib/intel/share-store';

type SharePayload = {
  title?: unknown;
  blocks?: unknown;
};

function isIntelBlock(value: unknown): value is IntelBlock {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const block = value as { type?: string };
  return typeof block.type === 'string';
}

export async function POST(request: NextRequest) {
  let payload: SharePayload;

  try {
    payload = (await request.json()) as SharePayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const title = typeof payload.title === 'string' && payload.title.trim()
    ? payload.title.trim().slice(0, 120)
    : 'Intel share';

  if (!Array.isArray(payload.blocks) || payload.blocks.length === 0) {
    return NextResponse.json({ error: 'Blocks are required.' }, { status: 400 });
  }

  const blocks = payload.blocks.filter(isIntelBlock).slice(0, 32);
  if (blocks.length === 0) {
    return NextResponse.json({ error: 'No valid blocks to share.' }, { status: 400 });
  }

  const token = randomUUID().replace(/-/g, '').slice(0, 16);
  const snapshot = saveIntelShareSnapshot({ token, title, blocks });

  return NextResponse.json({
    token: snapshot.token,
    href: `/ask/v/${snapshot.token}`,
    expiresAt: snapshot.expiresAt,
  });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Token is required.' }, { status: 400 });
  }

  const { getIntelShareSnapshot } = await import('@/lib/intel/share-store');
  const snapshot = getIntelShareSnapshot(token);
  if (!snapshot) {
    return NextResponse.json({ error: 'Share not found or expired.' }, { status: 404 });
  }

  return NextResponse.json(snapshot);
}
