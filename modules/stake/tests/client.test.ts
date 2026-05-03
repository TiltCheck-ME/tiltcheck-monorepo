/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StakeClient } from '../src/client.js';
import { AuthenticationError, RateLimitError, StakeApiError } from '../src/errors.js';

describe('@tiltcheck/stake StakeClient', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('uses the built-in mock API when STAKE_MOCK_API is enabled', async () => {
    vi.stubEnv('STAKE_MOCK_API', 'true');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const client = new StakeClient({ apiKey: 'test-key' });

    await expect(client.checkEligibility('VALID-CODE')).resolves.toMatchObject({
      eligible: true,
      wagersRequired: 50,
    });
    await expect(client.claimCode('VALID-CODE')).resolves.toMatchObject({
      success: true,
      reward: { type: 'bonus', amount: 10, currency: 'USD' },
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('maps HTTP 401 responses to AuthenticationError', async () => {
    vi.stubEnv('STAKE_MOCK_API', 'false');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 401,
      ok: false,
      headers: new Headers(),
      json: vi.fn().mockResolvedValue({ error: 'Unauthorized' }),
    } as unknown as Response);
    const client = new StakeClient({ apiKey: 'bad-key' });

    await expect(client.checkEligibility('VALID-CODE')).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('maps HTTP 429 responses to RateLimitError with retry hint', async () => {
    vi.stubEnv('STAKE_MOCK_API', 'false');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 429,
      ok: false,
      headers: new Headers({ 'Retry-After': '120' }),
      json: vi.fn().mockResolvedValue({ error: 'Too many requests' }),
    } as unknown as Response);
    const client = new StakeClient({ apiKey: 'test-key' });

    await expect(client.checkEligibility('VALID-CODE')).rejects.toMatchObject({
      name: 'RateLimitError',
      retryAfter: 120,
    } satisfies Partial<RateLimitError>);
  });

  it('wraps network failures as StakeApiError', async () => {
    vi.stubEnv('STAKE_MOCK_API', 'false');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('socket hang up'));
    const client = new StakeClient({ apiKey: 'test-key' });

    await expect(client.claimCode('VALID-CODE')).rejects.toMatchObject({
      name: 'StakeApiError',
      message: 'socket hang up',
    } satisfies Partial<StakeApiError>);
  });
});
