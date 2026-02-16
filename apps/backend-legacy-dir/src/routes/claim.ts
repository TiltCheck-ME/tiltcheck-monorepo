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
import { ClaimService } from '../claim-service.js';

const router = express.Router();

// Initialize ClaimService (singleton pattern)
let claimService: ClaimService | null = null;

function getClaimService(): ClaimService {
  if (!claimService) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/tiltcheck';
    const encryptionKey = process.env.API_KEY_ENCRYPTION_KEY;

    if (!encryptionKey) {
      throw new Error('API_KEY_ENCRYPTION_KEY environment variable is required');
    }

    claimService = new ClaimService({
      redisUrl,
      databaseUrl,
      encryptionKey,
    });

    // Initialize schema on first use
    claimService.initialize().catch((err) => {
      console.error('[ClaimRoutes] Failed to initialize database:', err);
    });
  }
  
  return claimService;
}

/**
 * POST /api/claim/submit
 * Submit user's Stake API key and trigger claim processing
 * 
 * Body: { apiKey: string }
 * Returns: { userId: string, message: string }
 */
router.post('/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    const { apiKey } = req.body;

    if (!apiKey || typeof apiKey !== 'string') {
      res.status(400).json({ error: 'API key is required' });
      return;
    }

    // Validate API key format (basic check)
    if (apiKey.length < 10) {
      res.status(400).json({ error: 'Invalid API key format' });
      return;
    }

    const service = getClaimService();
    const { userId } = await service.submitApiKey(apiKey);

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
    const service = getClaimService();
    const stats = await service.getClaimStatus(userId);
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

    const service = getClaimService();
    const claims = await service.getClaimHistory(userId, limit, statusFilter);

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
router.get('/codes', async (_req: Request, res: Response) => {
  try {
    const service = getClaimService();
    const codes = await service.getAvailableCodes();
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
    const service = getClaimService();
    await service.deleteUserData(userId);
    res.json({ message: 'User data deleted successfully' });
  } catch (error) {
    console.error('[API] Error deleting user data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
