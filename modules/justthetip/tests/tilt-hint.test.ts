/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/tip-log.js', () => ({
  getRecentSentTips: vi.fn().mockReturnValue([]),
}));

import { guardTipForWallet } from '../src/tilt-hint.js';

describe('guardTipForWallet', () => {
  const originalFailClosed = process.env.COOLDOWN_GUARD_FAIL_CLOSED;

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(),
    );
    delete process.env.COOLDOWN_GUARD_FAIL_CLOSED;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalFailClosed === undefined) delete process.env.COOLDOWN_GUARD_FAIL_CLOSED;
    else process.env.COOLDOWN_GUARD_FAIL_CLOSED = originalFailClosed;
  });

  it('blocks a wallet with an active all-scope lock', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ locked: true, scope: 'all', endTime: 2_000_000_000 }),
    } as Response);
    const result = await guardTipForWallet('Wallet111111111111111111111111111111111');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/self-excluded|cooldown/i);
  });

  it('allows a wallet that is not locked', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ locked: false, scope: null, endTime: null }),
    } as Response);
    const result = await guardTipForWallet('Wallet111111111111111111111111111111111');
    expect(result.allowed).toBe(true);
  });

  it('fail-open on RPC error by default', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const result = await guardTipForWallet('Wallet111111111111111111111111111111111');
    expect(result.allowed).toBe(true);
  });

  it('fail-closed on RPC error when COOLDOWN_GUARD_FAIL_CLOSED=true', async () => {
    process.env.COOLDOWN_GUARD_FAIL_CLOSED = 'true';
    vi.mocked(fetch).mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const result = await guardTipForWallet('Wallet111111111111111111111111111111111');
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/fail-closed/i);
  });
});
