// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19
/**
 * @tiltcheck/api - CollectClock Bonuses Proxy Routes
 *
 * Route: GET /bonuses         - Proxy CollectClock bonus data with trust score enrichment
 * Route: GET /bonuses/trust/:casinoName - Get trust score for a casino by name
 */

import { Router, Request, Response } from 'express';
import { getActiveEmailBonusEntries, readEmailBonusFeed } from '../lib/email-bonus-feed.js';
import { optionalAuthMiddleware } from '../middleware/auth.js';
import { resolveExclusionProfileForRequest, suppressBonusEntries } from '../services/bonus-suppression.js';

const router = Router();

// ---------------------------------------------------------------------------
// In-memory cache: 1-hour TTL
// ---------------------------------------------------------------------------
interface CacheEntry {
  data: unknown;
  fetchedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map<string, CacheEntry>();

const COLLECTCLOCK_BONUS_URL =
  'https://raw.githubusercontent.com/TiltCheck-ME/CollectClock/main/bonus-data.json';

// ---------------------------------------------------------------------------
// GET /bonuses
// Fetches CollectClock bonus-data.json, caches for 1 hour, returns with CORS.
// ---------------------------------------------------------------------------
router.get('/', optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const cached = cache.get('bonus-data');
    const now = Date.now();
    const profile = await resolveExclusionProfileForRequest(req);

    if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
      const suppression = suppressBonusEntries(Array.isArray(cached.data) ? cached.data as Record<string, unknown>[] : [], profile);
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Age', String(Math.floor((now - cached.fetchedAt) / 1000)));
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.json({
        source: 'collectclock',
        cached: true,
        data: suppression.entries,
        suppression: {
          active: suppression.active,
          hiddenCount: suppression.hiddenCount,
        },
      });
      return;
    }

    const response = await fetch(COLLECTCLOCK_BONUS_URL, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      res.status(502).json({
        error: 'UPSTREAM_FETCH_FAILED',
        message: `CollectClock returned HTTP ${response.status}`,
      });
      return;
    }

    const data = await response.json();
    cache.set('bonus-data', { data, fetchedAt: now });
    const suppression = suppressBonusEntries(Array.isArray(data) ? data as Record<string, unknown>[] : [], profile);

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({
      source: 'collectclock',
      cached: false,
      data: suppression.entries,
      suppression: {
        active: suppression.active,
        hiddenCount: suppression.hiddenCount,
      },
    });
  } catch (err) {
    console.error('[Bonuses] Failed to fetch CollectClock data:', err);
    res.status(502).json({
      error: 'UPSTREAM_FETCH_ERROR',
      message: 'Could not retrieve bonus data from CollectClock.',
    });
  }
});

// ---------------------------------------------------------------------------
// GET /bonuses/inbox
// Returns the persisted inbox bonus feed for the web bonus hub.
// ---------------------------------------------------------------------------
router.get('/inbox', optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const feed = readEmailBonusFeed();
    const activeBonuses = getActiveEmailBonusEntries();
    const profile = await resolveExclusionProfileForRequest(req);
    const suppression = suppressBonusEntries(activeBonuses, profile);
    const message = suppression.entries.length === 0
      ? suppression.hiddenCount > 0 && suppression.active
        ? 'Inbox bonus feed is live, but your active filters suppressed every matching casino bonus.'
        : 'Inbox bonus feed is empty or no active email bonuses are available.'
      : undefined;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({
      source: 'email-inbox',
      available: suppression.entries.length > 0,
      updatedAt: feed.updatedAt,
      total: suppression.entries.length,
      data: suppression.entries,
      message,
      suppression: {
        active: suppression.active,
        hiddenCount: suppression.hiddenCount,
      },
    });
  } catch (error) {
    console.error('[Bonuses] Failed to load inbox bonus feed:', error);
    res.status(500).json({
      source: 'email-inbox',
      available: false,
      total: 0,
      data: [],
      error: 'INBOX_FEED_LOAD_FAILED',
    });
  }
});

// ---------------------------------------------------------------------------
// GET /bonuses/trust/:casinoName
// Stub trust score endpoint — full analysis via TiltCheck casino audit engine.
// ---------------------------------------------------------------------------
router.get('/trust/:casinoName', (req: Request, res: Response): void => {
  const { casinoName } = req.params;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    casino: casinoName,
    trustScore: null,
    status: 'pending',
    message:
      'Trust score analysis coming soon. Visit tiltcheck.me for full casino audits.',
  });
});

export { router as bonusesRouter };
