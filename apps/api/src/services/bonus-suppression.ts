// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19

import type { Request } from 'express';
import { findUserByDiscordId } from '@tiltcheck/db';
import type { ForbiddenGamesProfile } from '@tiltcheck/types';
import { profileBlocksTarget, getForbiddenGamesProfile } from './exclusion-cache.js';
import type { AuthRequest } from '../middleware/auth.js';

interface BonusLikeEntry {
  brand?: string | null;
  url?: string | null;
  senderDomain?: string | null;
}

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

function hasInternalServiceAccess(req: Request): boolean {
  const internalSecret = process.env.INTERNAL_API_SECRET?.trim();
  if (!internalSecret) {
    return false;
  }

  const bearerToken = extractBearerToken(req.headers.authorization);
  const headerSecret = typeof req.headers['x-internal-secret'] === 'string' ? req.headers['x-internal-secret'].trim() : '';
  return bearerToken === internalSecret || headerSecret === internalSecret;
}

function normalizeSlugValue(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized.length > 0 ? normalized : null;
}

function buildCasinoCandidates(entry: BonusLikeEntry): string[] {
  const candidates = new Set<string>();
  const addCandidate = (value: string | null | undefined) => {
    const normalized = normalizeSlugValue(value);
    if (normalized) {
      candidates.add(normalized);
    }
  };

  addCandidate(entry.brand);
  addCandidate(entry.senderDomain);

  const rawUrl = typeof entry.url === 'string' ? entry.url.trim() : '';
  if (rawUrl) {
    try {
      const parsedUrl = new URL(rawUrl);
      const hostname = parsedUrl.hostname.replace(/^www\./i, '').toLowerCase();
      addCandidate(hostname);
      addCandidate(hostname.split('.')[0] ?? '');
      for (const segment of hostname.split('.')) {
        addCandidate(segment);
      }
    } catch {
      addCandidate(rawUrl);
    }
  }

  return [...candidates];
}

export async function resolveExclusionProfileForRequest(req: Request): Promise<ForbiddenGamesProfile | null> {
  const authUser = (req as AuthRequest).user;
  if (authUser?.id) {
    return getForbiddenGamesProfile(authUser.id);
  }

  if (!hasInternalServiceAccess(req)) {
    return null;
  }

  const discordId = typeof req.query.discordId === 'string' ? req.query.discordId.trim() : '';
  if (!discordId) {
    return null;
  }

  const user = await findUserByDiscordId(discordId);
  if (!user) {
    return null;
  }

  return getForbiddenGamesProfile(user.id);
}

export function suppressBonusEntries<T extends BonusLikeEntry>(
  entries: T[],
  profile: ForbiddenGamesProfile | null,
): { entries: T[]; hiddenCount: number; active: boolean } {
  if (!profile) {
    return {
      entries,
      hiddenCount: 0,
      active: false,
    };
  }

  const visibleEntries: T[] = [];
  let hiddenCount = 0;

  for (const entry of entries) {
    const blocked = buildCasinoCandidates(entry).some((candidate) => (
      profileBlocksTarget(profile, { casino: candidate })
    ));

    if (blocked) {
      hiddenCount += 1;
      continue;
    }

    visibleEntries.push(entry);
  }

  return {
    entries: visibleEntries,
    hiddenCount,
    active: true,
  };
}
