// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tiltcheck/monitoring', () => ({
  ALERT_RULES: {
    EMAIL_INGEST_SUSTAINED_PARSE_FAILURES: {
      id: 'EMAIL_INGEST_SUSTAINED_PARSE_FAILURES',
      name: 'Email intake sustained parse failures',
      threshold: 5,
      cooldownMs: 15 * 60 * 1000,
      notificationChannel: 'log' as const,
    },
  },
  triggerAlert: vi.fn().mockResolvedValue(undefined),
  resetAlertCooldown: vi.fn(),
}));

import { triggerAlert } from '@tiltcheck/monitoring';
import {
  recordEmailIngestParseFailure,
  resetEmailIngestParseHealthForTests,
} from '../../src/lib/email-ingest-parse-health.js';

describe('email-ingest-parse-health', () => {
  beforeEach(() => {
    vi.mocked(triggerAlert).mockClear();
    resetEmailIngestParseHealthForTests();
    process.env.EMAIL_INGEST_PARSE_FAILURE_ALERT_THRESHOLD = '3';
    process.env.EMAIL_INGEST_PARSE_FAILURE_WINDOW_MS = '600000';
  });

  afterEach(() => {
    delete process.env.EMAIL_INGEST_PARSE_FAILURE_ALERT_THRESHOLD;
    delete process.env.EMAIL_INGEST_PARSE_FAILURE_WINDOW_MS;
    resetEmailIngestParseHealthForTests();
  });

  it('calls triggerAlert once the failure threshold is reached', async () => {
    await recordEmailIngestParseFailure({ reason: 'a' });
    await recordEmailIngestParseFailure({ reason: 'b' });
    expect(triggerAlert).not.toHaveBeenCalled();
    await recordEmailIngestParseFailure({ reason: 'c' });
    expect(triggerAlert).toHaveBeenCalledTimes(1);
  });
});
