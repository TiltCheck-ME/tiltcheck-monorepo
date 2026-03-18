/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Geo-Compliance Middleware
 * 
 * Leverages Cloudflare's cf-ipcountry header to detect user jurisdiction
 * and enforce regional restrictions based on the configured environment.
 */

import type { Request, Response, NextFunction } from 'express';
import { isCountryRestricted } from '@tiltcheck/config';

import { createError } from '../lib/error-factory.js';

/**
 * Middleware to restrict access based on user country.
 * Primarily used to comply with local gambling regulations.
 */
export function geoComplianceMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Cloudflare provides the country code in ISO-3166-1 alpha-2 format
  const countryCode = req.headers['cf-ipcountry'] as string | undefined;

  // In development, you might want to bypass or mock this
  if (process.env.NODE_ENV !== 'production' && !countryCode) {
      return next();
  }

  if (countryCode && isCountryRestricted(countryCode)) {
    console.warn(`[Compliance] Blocked request from restricted region: ${countryCode}`);
    
    return next(createError.forbidden(
      `Access restricted in your region (${countryCode})`, 
      'GEO_RESTRICTED',
      { country: countryCode }
    ));
  }

  next();
}
