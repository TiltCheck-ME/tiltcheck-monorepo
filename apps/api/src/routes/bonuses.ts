// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-17
/**
 * @tiltcheck/api - CollectClock Bonuses Proxy Routes
 *
 * Route: GET /bonuses         - Proxy CollectClock bonus data with trust score enrichment
 * Route: GET /bonuses/trust/:casinoName - Get trust score for a casino by name
 */

import { Router, Request, Response } from 'express';
import { getActiveEmailBonusEntries, readEmailBonusFeed } from '../lib/email-bonus-feed.js';

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
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const cached = cache.get('bonus-data');
    const now = Date.now();

    if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Age', String(Math.floor((now - cached.fetchedAt) / 1000)));
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.json({ source: 'collectclock', cached: true, data: cached.data });
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

    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({ source: 'collectclock', cached: false, data });
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
router.get('/inbox', (_req: Request, res: Response): void => {
  try {
    const feed = readEmailBonusFeed();
    const activeBonuses = getActiveEmailBonusEntries();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({
      source: 'email-inbox',
      available: activeBonuses.length > 0,
      updatedAt: feed.updatedAt,
      total: activeBonuses.length,
      data: activeBonuses,
      message: activeBonuses.length === 0
        ? 'Inbox bonus feed is empty or no active email bonuses are available.'
        : undefined,
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
