/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03 */
/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  StakeVaultAdapter,
  GenericDOMVaultAdapter,
  getAdapterForHost,
  getCasinoName,
} from '../../src/casino-vault-adapters.js';

describe('StakeVaultAdapter', () => {
  let adapter: StakeVaultAdapter;

  beforeEach(() => {
    adapter = new StakeVaultAdapter();
    vi.restoreAllMocks();
  });

  it('resolves the GraphQL endpoint dynamically for stake.us to preserve session cookies', () => {
    expect(adapter.getGraphQLEndpoint('stake.us')).toBe('https://stake.us/_api/graphql');
    expect(adapter.getGraphQLEndpoint('play.stake.us')).toBe('https://stake.us/_api/graphql');
    expect(adapter.getGraphQLEndpoint('STAKE.US')).toBe('https://stake.us/_api/graphql');
    expect(adapter.getGraphQLEndpoint('evil-stake.us.attacker.com')).toBe('https://api.stake.com/graphql');
  });

  it('resolves the GraphQL endpoint for stake.com', () => {
    expect(adapter.getGraphQLEndpoint('stake.com')).toBe('https://api.stake.com/graphql');
    expect(adapter.getGraphQLEndpoint('play.stake.com')).toBe('https://api.stake.com/graphql');
  });

  it('falls back to window.location.hostname when no hostname is passed', () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'stake.us' },
      writable: true,
    });
    expect(adapter.getGraphQLEndpoint()).toBe('https://stake.us/_api/graphql');

    Object.defineProperty(window, 'location', {
      value: { hostname: 'stake.com' },
      writable: true,
    });
    expect(adapter.getGraphQLEndpoint()).toBe('https://api.stake.com/graphql');
  });

  it('fetches balance using the resolved endpoint and credentials: include', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'stake.us' },
      writable: true,
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          user: {
            balances: [{ available: { amount: 250.75 } }],
          },
        },
      }),
    });
    globalThis.fetch = mockFetch;

    const balance = await adapter.getBalance();
    expect(balance).toBe(250.75);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://stake.us/_api/graphql',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      })
    );
  });

  it('returns null on balance fetch failure or non-ok response', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const balance = await adapter.getBalance();
    expect(balance).toBeNull();

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ errors: [{ message: 'Unauthorized' }] }),
    });
    const balanceUnauthorized = await adapter.getBalance();
    expect(balanceUnauthorized).toBeNull();
  });

  it('vaults amount using resolved endpoint with credentials: include', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'stake.us' },
      writable: true,
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          createVaultDeposit: { id: 'deposit-xyz-123', amount: 50 },
        },
      }),
    });
    globalThis.fetch = mockFetch;

    const success = await adapter.vaultAmount(50);
    expect(success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://stake.us/_api/graphql',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: expect.stringContaining('"amount":50'),
      })
    );
  });

  it('returns false when vault deposit request is not ok', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    const success = await adapter.vaultAmount(50);
    expect(success).toBe(false);
  });
});

describe('Registry and DOM adapter', () => {
  it('resolves correct adapter and casino name for hosts', () => {
    expect(getCasinoName('stake.us')).toBe('stake');
    expect(getCasinoName('roobet.com')).toBe('roobet');
    expect(getCasinoName('unknown-site.xyz')).toBe('unknown');

    expect(getAdapterForHost('stake.com')).toBeInstanceOf(StakeVaultAdapter);
    expect(getAdapterForHost('roobet.com')).toBeInstanceOf(GenericDOMVaultAdapter);
    expect(getAdapterForHost('unknown-site.xyz')).toBeNull();
  });
});
