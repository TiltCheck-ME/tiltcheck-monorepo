// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
/**
 * Credit Manager — Consolidated Bridge
 * This file is now a thin wrapper around @tiltcheck/justthetip/CreditService.
 */

import { CreditService, FLAT_FEE_LAMPORTS, MIN_DEPOSIT_LAMPORTS } from '@tiltcheck/justthetip';
import type { DatabaseClient } from '@tiltcheck/database';

export { FLAT_FEE_LAMPORTS, MIN_DEPOSIT_LAMPORTS };

/**
 * CreditManager handles custodial balances and transactions.
 * Now using the shared @tiltcheck/justthetip module.
 */
export class CreditManager extends CreditService {
  constructor(db: DatabaseClient) {
    super(db);
    console.log('[JustTheTip] CreditManager initialized (Consolidated)');
  }

  // Any bot-specific extensions can go here, but strive to keep them in the shared module.
}
