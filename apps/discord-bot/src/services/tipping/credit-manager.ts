/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Credit Manager — Consolidated Bridge
 * This file is now a thin wrapper around @tiltcheck/justthetip/CreditService.
 */

import { CreditService, FLAT_FEE_LAMPORTS, MIN_DEPOSIT_LAMPORTS } from '@tiltcheck/justthetip';
import type { DatabaseClient } from '@tiltcheck/database';

export { FLAT_FEE_LAMPORTS, MIN_DEPOSIT_LAMPORTS };

/**
 * CreditManager handles credit ledger entries settled via the bot operational wallet (pooled relay).
 * Not non-custodial for the credit leg — see docs/legal/custody-matrix.md (jtt_credits_relay).
 * Now using the shared @tiltcheck/justthetip module.
 */
export class CreditManager extends CreditService {
  constructor(db: DatabaseClient) {
    super(db);
    console.log('[JustTheTip] CreditManager initialized (Consolidated)');
  }

  // Any bot-specific extensions can go here, but strive to keep them in the shared module.
}
