/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-02 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { initLedger, createPayout, listPayouts, markPayoutAttempt, retryPayout } from '../src/ledger.js';

const TEST_DIR = path.join(os.tmpdir(), 'tiltcheck-payout-test-' + Date.now());

describe('prize-payout ledger', () => {
  it('is idempotent for same idempotency key', () => {
    initLedger({ dir: TEST_DIR });
    const payload = { idempotencyKey: 'abc-123', distributionId: 'dist-1', recipients: ['u1','u2'], total: 2 };
    const p1 = createPayout(payload, { dir: TEST_DIR });
    const p2 = createPayout(payload, { dir: TEST_DIR });
    expect(p1.id).toBe(p2.id);
    const list = listPayouts({ dir: TEST_DIR });
    expect(list.length).toBe(1);
  });

  it('records attempts and transitions to failed after max attempts', () => {
    initLedger({ dir: TEST_DIR });
    const payload = { idempotencyKey: 'fail-1', distributionId: 'dist-fail', recipients: ['u1'], total: 1 };
    const p = createPayout(payload, { dir: TEST_DIR });
    // Simulate 5 failed attempts
    for (let i = 0; i < 5; i++) {
      markPayoutAttempt(p.id, { success: false, error: 'transient' }, { dir: TEST_DIR, maxAttempts: 5 });
    }
    const reloaded = listPayouts({ dir: TEST_DIR }).find(x => x.id === p.id);
    expect(reloaded.status).toBe('failed');
  });

  it('allows manual retry to pending', () => {
    initLedger({ dir: TEST_DIR });
    const payload = { idempotencyKey: 'retry-1', distributionId: 'dist-retry', recipients: ['u1'], total: 1 };
    const p = createPayout(payload, { dir: TEST_DIR });
    markPayoutAttempt(p.id, { success: false, error: 'transient' }, { dir: TEST_DIR, maxAttempts: 1 });
    const failed = listPayouts({ dir: TEST_DIR }).find(x => x.id === p.id);
    expect(failed.status).toBe('failed');
    retryPayout(p.id, { dir: TEST_DIR });
    const retried = listPayouts({ dir: TEST_DIR }).find(x => x.id === p.id);
    expect(retried.status).toBe('pending');
  });

  it('resets historical attempts on manual retry', () => {
    initLedger({ dir: TEST_DIR });
    const payload = { idempotencyKey: 'retry-2', distributionId: 'dist-retry-2', recipients: ['u1'], total: 1 };
    const p = createPayout(payload, { dir: TEST_DIR });

    for (let i = 0; i < 5; i++) {
      markPayoutAttempt(p.id, { success: false, error: `transient-${i}` }, { dir: TEST_DIR, maxAttempts: 5 });
    }

    retryPayout(p.id, { dir: TEST_DIR });
    const retried = listPayouts({ dir: TEST_DIR }).find(x => x.id === p.id);
    expect(retried.status).toBe('pending');
    expect(retried.attempts).toEqual([]);

    const afterRetryFailure = markPayoutAttempt(
      p.id,
      { success: false, error: 'post-retry-failure' },
      { dir: TEST_DIR, maxAttempts: 5 }
    );

    expect(afterRetryFailure.status).toBe('pending');
    expect(afterRetryFailure.attempts).toHaveLength(1);
    expect(afterRetryFailure.lastError).toBe('post-retry-failure');
  });
});
