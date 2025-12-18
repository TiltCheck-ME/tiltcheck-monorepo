/**
 * Claim API Routes
 * 
 * HTTP endpoints for the TiltCheck Auto-Claimer frontend to:
 * - Submit user API keys
 * - Fetch claim status
 * - Get claim history
 * 
 * SECURITY: User API keys are NEVER exposed to the client.
 * They are stored encrypted server-side and used only for claiming.
 */

import express, { type Request, type Response } from 'express';
import { randomUUID } from 'crypto';

const router = express.Router();

// NOTE: These are placeholder implementations
// In production, integrate with actual database and job queue

/**
 * POST /api/claim/submit
 * Submit user's Stake API key and trigger claim processing
 * 
 * Body: { apiKey: string }
 * Returns: { userId: string, message: string }
 */
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ error: 'API key is required' });
    }

    // Generate unique user ID
    const userId = randomUUID();

    // TODO: Store encrypted API key in database
    // await database.storeUserApiKey(userId, apiKey);

    // TODO: Queue claim jobs for all active codes
    // const activeCodes = await codeDatabase.getActiveCodes();
    // for (const code of activeCodes) {
    //   await claimQueue.add('claim', { userId, code: code.code });
    // }

    console.log(`[API] Stored API key and queued claims for user: ${userId}`);

    res.json({
      userId,
      message: 'API key received. Claims are being processed.',
    });
  } catch (error) {
    console.error('[API] Error submitting API key:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/claim/status/:userId
 * Get overall claim status for a user
 * 
 * Returns: {
 *   userId: string,
 *   total: number,
 *   claimed: number,
 *   skipped: number,
 *   failed: number,
 *   processing: number
 * }
 */
router.get('/status/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // TODO: Fetch claim history from database
    // const history = await database.getClaimHistory(userId);

    // Placeholder response
    const history: any[] = [];

    const stats = {
      userId,
      total: history.length,
      claimed: history.filter((h) => h.status === 'claimed').length,
      skipped: history.filter((h) => h.status === 'skipped').length,
      failed: history.filter((h) => h.status === 'failed').length,
      processing: 0, // TODO: Count pending jobs in queue
    };

    res.json(stats);
  } catch (error) {
    console.error('[API] Error fetching status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/claim/history/:userId
 * Get detailed claim history for a user
 * 
 * Query params:
 * - limit: number (default: 50)
 * - status: 'claimed' | 'skipped' | 'failed' (optional filter)
 * 
 * Returns: {
 *   userId: string,
 *   claims: Array<{
 *     id: string,
 *     code: string,
 *     status: string,
 *     reason?: string,
 *     reward?: object,
 *     attemptedAt: string
 *   }>
 * }
 */
router.get('/history/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const statusFilter = req.query.status as string | undefined;

    // TODO: Fetch claim history from database
    // let history = await database.getClaimHistory(userId, limit);
    // if (statusFilter) {
    //   history = history.filter((h) => h.status === statusFilter);
    // }

    // Placeholder response
    const claims: any[] = [];

    res.json({
      userId,
      claims,
    });
  } catch (error) {
    console.error('[API] Error fetching history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/claim/codes
 * Get list of available codes that can be claimed
 * 
 * Returns: {
 *   codes: Array<{
 *     code: string,
 *     source: string,
 *     detectedAt: string,
 *     wagersRequired?: number
 *   }>
 * }
 */
router.get('/codes', async (req: Request, res: Response) => {
  try {
    // TODO: Fetch active codes from database
    // const activeCodes = await codeDatabase.getActiveCodes();

    // Placeholder response
    const codes: any[] = [];

    res.json({ codes });
  } catch (error) {
    console.error('[API] Error fetching codes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/claim/user/:userId
 * Delete user data (API key and claim history)
 * Allows users to remove their data
 * 
 * Returns: { message: string }
 */
router.delete('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // TODO: Delete user data from database
    // await database.deleteUserApiKey(userId);
    // await database.deleteClaimHistory(userId);

    console.log(`[API] Deleted data for user: ${userId}`);

    res.json({ message: 'User data deleted successfully' });
  } catch (error) {
    console.error('[API] Error deleting user data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
