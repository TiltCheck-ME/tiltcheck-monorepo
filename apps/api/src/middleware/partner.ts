/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Partner Authentication Middleware
 * 
 * Verifies AppId and SecretKey from headers to authorize partner API calls.
 */

import type { Request, Response, NextFunction } from 'express';
import { findPartnerByAppId } from '@tiltcheck/db';

export interface PartnerRequest extends Request {
  partner?: {
    id: string;
    name: string;
    appId: string;
    isActive: boolean;
  };
}

/**
 * Middleware to verify partner credentials and attach partner info to request
 */
export async function partnerAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const appId = req.headers['x-tiltcheck-app-id'];
  const secretKey = req.headers['x-tiltcheck-secret-key'];

  if (!appId || !secretKey || typeof appId !== 'string' || typeof secretKey !== 'string') {
    res.status(401).json({
      error: 'Missing partner authentication headers (X-TiltCheck-App-Id, X-TiltCheck-Secret-Key)',
      code: 'PARTNER_UNAUTHORIZED'
    });
    return;
  }

  try {
    const partner = await findPartnerByAppId(appId);

    if (!partner || !partner.is_active) {
      res.status(401).json({
        error: 'Invalid or inactive partner AppId',
        code: 'PARTNER_INVALID'
      });
      return;
    }

    // Verify secret key correctly (In prod, this might be hashed/hashed in DB)
    if (partner.secret_key !== secretKey) {
      res.status(401).json({
        error: 'Invalid partner secret key',
        code: 'PARTNER_FORBIDDEN'
      });
      return;
    }

    // Attach partner info to request
    (req as PartnerRequest).partner = {
      id: partner.id,
      name: partner.name,
      appId: partner.app_id,
      isActive: partner.is_active,
    };

    next();
  } catch (error) {
    console.error('[Partner Auth] Error:', error);
    res.status(500).json({
      error: 'Partner authentication failed',
      code: 'PARTNER_AUTH_ERROR'
    });
  }
}
