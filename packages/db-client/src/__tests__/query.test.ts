/**
 * Unit tests for packages/db-client/src/query.ts
 *
 * The Supabase client is fully mocked so no network calls are made.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the client module BEFORE importing query helpers so the singleton
// is replaced everywhere.
// ---------------------------------------------------------------------------

const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockUpdate = vi.fn();
const mockUpsert = vi.fn();
const mockFrom = vi.fn();

// Build a chainable mock that mirrors how Supabase query builders work.
function buildChain(terminalFn: () => unknown) {
  const chain: Record<string, unknown> = {};
  chain['select'] = vi.fn(() => chain);
  chain['eq'] = vi.fn(() => chain);
  chain['maybeSingle'] = vi.fn(terminalFn);
  chain['single'] = vi.fn(terminalFn);
  chain['upsert'] = vi.fn(() => chain);
  chain['update'] = vi.fn(() => chain);
  return chain;
}

vi.mock('../client.js', () => ({
  getSupabaseClient: vi.fn(() => ({ from: mockFrom })),
  initSupabaseClient: vi.fn(),
  resetSupabaseClient: vi.fn(),
  getDbClientConfig: vi.fn(),
}));

import { findById, findMany, upsert, softDelete } from '../query.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TestRow {
  id: string;
  name: string;
  deleted_at: string | null;
}

function makeRow(overrides: Partial<TestRow> = {}): TestRow {
  return { id: 'abc-123', name: 'Alice', deleted_at: null, ...overrides };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('findById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the row when found', async () => {
    const row = makeRow();
    const chain = buildChain(() => Promise.resolve({ data: row, error: null }));
    mockFrom.mockReturnValue(chain);

    const result = await findById<TestRow>('users', 'abc-123');
    expect(result).toEqual(row);
    expect(mockFrom).toHaveBeenCalledWith('users');
  });

  it('returns null when no row matches', async () => {
    const chain = buildChain(() => Promise.resolve({ data: null, error: null }));
    mockFrom.mockReturnValue(chain);

    const result = await findById<TestRow>('users', 'nonexistent');
    expect(result).toBeNull();
  });

  it('throws on Supabase error', async () => {
    const chain = buildChain(() =>
      Promise.resolve({ data: null, error: { message: 'DB exploded' } })
    );
    mockFrom.mockReturnValue(chain);

    await expect(findById<TestRow>('users', 'abc')).rejects.toThrow(
      '[db-client] findById on "users" failed: DB exploded'
    );
  });
});

describe('findMany', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns rows without filters', async () => {
    const rows = [makeRow(), makeRow({ id: 'def-456', name: 'Bob' })];
    // findMany uses a non-single terminal (awaits the query builder directly)
    const chain: Record<string, unknown> = {};
    chain['select'] = vi.fn(() => chain);
    chain['eq'] = vi.fn(() => chain);
    // Make the chain itself thenable so `await query` works
    chain['then'] = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(resolve);
    mockFrom.mockReturnValue(chain);

    const result = await findMany<TestRow>('users');
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Alice');
  });

  it('applies equality filters', async () => {
    const rows = [makeRow()];
    const chain: Record<string, unknown> = {};
    const eqSpy = vi.fn(() => chain);
    chain['select'] = vi.fn(() => chain);
    chain['eq'] = eqSpy;
    chain['then'] = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(resolve);
    mockFrom.mockReturnValue(chain);

    await findMany<TestRow>('users', { role: 'admin', active: true });

    // eq should have been called once per filter key
    expect(eqSpy).toHaveBeenCalledTimes(2);
    expect(eqSpy).toHaveBeenCalledWith('role', 'admin');
    expect(eqSpy).toHaveBeenCalledWith('active', true);
  });

  it('returns empty array when no rows', async () => {
    const chain: Record<string, unknown> = {};
    chain['select'] = vi.fn(() => chain);
    chain['eq'] = vi.fn(() => chain);
    chain['then'] = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: null, error: null }).then(resolve);
    mockFrom.mockReturnValue(chain);

    const result = await findMany<TestRow>('users');
    expect(result).toEqual([]);
  });

  it('throws on Supabase error', async () => {
    const chain: Record<string, unknown> = {};
    chain['select'] = vi.fn(() => chain);
    chain['eq'] = vi.fn(() => chain);
    chain['then'] = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: null, error: { message: 'timeout' } }).then(resolve);
    mockFrom.mockReturnValue(chain);

    await expect(findMany<TestRow>('users')).rejects.toThrow(
      '[db-client] findMany on "users" failed: timeout'
    );
  });
});

describe('upsert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the upserted row', async () => {
    const row = makeRow();
    const chain = buildChain(() => Promise.resolve({ data: row, error: null }));
    mockFrom.mockReturnValue(chain);

    const result = await upsert<TestRow>('users', { id: 'abc-123', name: 'Alice' });
    expect(result).toEqual(row);
    expect(mockFrom).toHaveBeenCalledWith('users');
  });

  it('throws when no row is returned', async () => {
    const chain = buildChain(() => Promise.resolve({ data: null, error: null }));
    mockFrom.mockReturnValue(chain);

    await expect(upsert<TestRow>('users', { id: 'abc-123' })).rejects.toThrow(
      'no row returned after upsert'
    );
  });

  it('throws on Supabase error', async () => {
    const chain = buildChain(() =>
      Promise.resolve({ data: null, error: { message: 'constraint violation' } })
    );
    mockFrom.mockReturnValue(chain);

    await expect(upsert<TestRow>('users', { id: 'abc-123' })).rejects.toThrow(
      '[db-client] upsert on "users" failed: constraint violation'
    );
  });
});

describe('softDelete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls update with deleted_at timestamp', async () => {
    const updateSpy = vi.fn(() => chain);
    const eqSpy = vi.fn(() => Promise.resolve({ data: null, error: null }));
    const chain: Record<string, unknown> = {
      update: updateSpy,
      eq: eqSpy,
    };
    // Make update return a chainable object with eq
    updateSpy.mockReturnValue({ eq: eqSpy });
    mockFrom.mockReturnValue(chain);

    const before = new Date();
    await softDelete('users', 'abc-123');
    const after = new Date();

    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(updateSpy).toHaveBeenCalledTimes(1);

    const updatePayload = updateSpy.mock.calls[0][0] as { deleted_at: string };
    const ts = new Date(updatePayload.deleted_at);
    expect(ts.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(ts.getTime()).toBeLessThanOrEqual(after.getTime());

    expect(eqSpy).toHaveBeenCalledWith('id', 'abc-123');
  });

  it('throws on Supabase error', async () => {
    const eqSpy = vi.fn(() => Promise.resolve({ error: { message: 'row locked' } }));
    const chain: Record<string, unknown> = {
      update: vi.fn(() => ({ eq: eqSpy })),
    };
    mockFrom.mockReturnValue(chain);

    await expect(softDelete('users', 'abc-123')).rejects.toThrow(
      '[db-client] softDelete on "users" failed: row locked'
    );
  });
});
