/**
 * Tilt Events API Routes
 * 
 * Handles storing and retrieving tilt detection events from Discord bot.
 * Events are emitted by @tiltcheck/tiltcheck-core when tilt is detected.
 */

import { Router, Request, Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config.js';

const router = Router();

// Initialize Supabase client for tilt events
let supabase: SupabaseClient | null = null;

if (config.supabase.url && config.supabase.anonKey) {
  supabase = createClient(config.supabase.url, config.supabase.anonKey);
}

/**
 * POST /api/tilt/events
 * Store a tilt detection event from Discord bot
 * 
 * Body:
 * {
 *   userId: "discord_user_id",
 *   timestamp: 1234567890,
 *   signals: [{ type: "rapid-messages", severity: 3 }],
 *   tiltScore: 3.5,
 *   context: "discord-dm" | "discord-guild"
 * }
 */
router.post('/events', async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const { userId, timestamp, signals, tiltScore, context } = req.body;

    // Validate required fields
    if (!userId || !timestamp || signals === undefined || tiltScore === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: userId, timestamp, signals, tiltScore',
      });
    }

    // Insert tilt event
    const { data, error } = await supabase.from('tilt_events').insert({
      user_id: userId,
      timestamp: new Date(timestamp).toISOString(),
      signals: JSON.stringify(signals),
      tilt_score: tiltScore,
      context: context || 'discord-dm',
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[TiltAPI] Error inserting tilt event:', error);
      return res.status(500).json({ error: 'Failed to store tilt event' });
    }

    // Insert returns the inserted rows if select after insert is enabled
    const eventId = (data && Array.isArray(data) && data[0]) ? (data[0] as any).id : undefined;

    return res.json({
      success: true,
      message: 'Tilt event recorded',
      eventId,
    });
  } catch (err) {
    console.error('[TiltAPI] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tilt/history/:userId
 * Retrieve tilt event history for a user (last 7 days)
 * 
 * Query params:
 * - limit: number (default: 100, max: 500)
 * - days: number (default: 7, max: 30)
 */
router.get('/history/:userId', async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const userId = req.params.userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const days = Math.min(parseInt(req.query.days as string) || 7, 30);

    // Calculate date range (last N days)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error, count } = await supabase
      .from('tilt_events')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[TiltAPI] Error fetching history:', error);
      return res.status(500).json({ error: 'Failed to fetch tilt history' });
    }

    // Parse signals back to JSON
    const events = (data || []).map(event => ({
      ...event,
      signals: typeof event.signals === 'string' ? JSON.parse(event.signals) : event.signals,
    }));

    res.json({
      success: true,
      userId,
      count,
      days,
      events,
    });
    return;
  } catch (err) {
    console.error('[TiltAPI] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/tilt/stats/:userId
 * Get tilt statistics for a user
 * 
 * Returns:
 * - totalEvents: number
 * - averageTiltScore: number
 * - maxTiltScore: number
 * - lastEventAt: ISO string
 * - eventsLast24h: number
 * - eventsLast7d: number
 */
router.get('/stats/:userId', async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const userId = req.params.userId;

    // Fetch all events for this user
    const { data, error } = await supabase
      .from('tilt_events')
      .select('timestamp, tilt_score')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('[TiltAPI] Error fetching stats:', error);
      return res.status(500).json({ error: 'Failed to calculate stats' });
    }

    const events = data || [];

    if (events.length === 0) {
      return res.json({
        success: true,
        userId,
        totalEvents: 0,
        averageTiltScore: 0,
        maxTiltScore: 0,
        lastEventAt: null,
        eventsLast24h: 0,
        eventsLast7d: 0,
      });
    }

    // Calculate statistics
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const scores = events.map(e => e.tilt_score).filter(s => s !== null);
    const averageTiltScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;
    const maxTiltScore = scores.length > 0 ? Math.max(...scores) : 0;

    const eventsLast24h = events.filter(e => new Date(e.timestamp) > last24h).length;
    const eventsLast7d = events.filter(e => new Date(e.timestamp) > last7d).length;

    res.json({
      success: true,
      userId,
      totalEvents: events.length,
      averageTiltScore: parseFloat(averageTiltScore.toFixed(2)),
      maxTiltScore,
      lastEventAt: events[0]?.timestamp || null,
      eventsLast24h,
      eventsLast7d,
    });
    return;
  } catch (err) {
    console.error('[TiltAPI] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/tilt/events/:eventId
 * Delete a specific tilt event (for testing/cleanup)
 */
router.delete('/events/:eventId', async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const eventId = req.params.eventId;

    const { error } = await supabase
      .from('tilt_events')
      .delete()
      .eq('id', eventId);

    if (error) {
      console.error('[TiltAPI] Error deleting event:', error);
      return res.status(500).json({ error: 'Failed to delete event' });
    }

    res.json({ success: true, message: 'Event deleted' });
    return;
  } catch (err) {
    console.error('[TiltAPI] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
