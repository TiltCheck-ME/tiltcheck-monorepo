/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */

import { describe, expect, it } from 'vitest';
import worker from '../src/index.js';

describe('@tiltcheck/compliance-edge worker', () => {
  it('returns matched state regulation details for supported US states', async () => {
    const request = new Request('https://tiltcheck.dev/compliance');
    (request as Request & { cf?: { country: string; regionCode: string } }).cf = {
      country: 'US',
      regionCode: 'NJ',
    };

    const response = await worker.fetch(
      request,
      { GEOLOCATION_API_KEY: 'test-key' },
      {} as ExecutionContext,
    );
    const payload = (await response.json()) as {
      location: { country: string; state: string };
      regulation: { status: string; summary: string };
    };

    expect(response.status).toBe(200);
    expect(payload.location).toEqual({ country: 'US', state: 'NJ' });
    expect(payload.regulation.status).toBe('legal');
    expect(payload.regulation.summary).toContain('New Jersey');
  });

  it('falls back to a generic response outside mapped states', async () => {
    const request = new Request('https://tiltcheck.dev/compliance');
    (request as Request & { cf?: { country: string; regionCode: string } }).cf = {
      country: 'CA',
      regionCode: 'ON',
    };

    const response = await worker.fetch(
      request,
      { GEOLOCATION_API_KEY: 'test-key' },
      {} as ExecutionContext,
    );
    const payload = (await response.json()) as {
      message: string;
      location: { country: string; state: string };
    };

    expect(response.status).toBe(200);
    expect(payload.message).toContain('No specific iGaming regulations found');
    expect(payload.location).toEqual({ country: 'CA', state: 'ON' });
  });
});
