/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-16 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const insertMock = vi.fn();
const updateMock = vi.fn();
const createSupabaseClientMock = vi.fn();

vi.mock('../src/client.js', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  insert: insertMock,
  update: updateMock,
  findById: vi.fn(),
  findOneBy: vi.fn(),
  exists: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createSupabaseClientMock,
}));

function createInsertFallbackClient(results: Array<{ data: Record<string, unknown> | null; error: { message?: string } | null }>) {
  const single = vi.fn();
  for (const result of results) {
    single.mockResolvedValueOnce(result);
  }

  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const from = vi.fn().mockReturnValue({ insert });

  return { client: { from }, from, insert };
}

function createUpdateFallbackClient(results: Array<{ data: Record<string, unknown> | null; error: { message?: string } | null }>) {
  const maybeSingle = vi.fn();
  for (const result of results) {
    maybeSingle.mockResolvedValueOnce(result);
  }

  const select = vi.fn().mockReturnValue({ maybeSingle });
  const eq = vi.fn().mockReturnValue({ select });
  const update = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ update });

  return { client: { from }, from, update };
}

async function loadQueriesModule() {
  vi.resetModules();
  return import('../src/queries.ts');
}

describe('@tiltcheck/db users fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
  });

  it('retries createUser without discord_username when Supabase users schema is behind', async () => {
    insertMock.mockRejectedValueOnce(new Error('permission denied for table users'));
    const fallbackClient = createInsertFallbackClient([
      {
        data: null,
        error: { message: "Could not find the 'discord_username' column of 'users' in the schema cache" },
      },
      {
        data: {
          id: 'user-1',
          discord_id: 'discord-1',
          discord_username: 'tester',
          roles: ['user'],
          created_at: '2026-04-16T00:00:00.000Z',
          updated_at: '2026-04-16T00:00:00.000Z',
        },
        error: null,
      },
    ]);
    createSupabaseClientMock.mockReturnValueOnce(fallbackClient.client);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { createUser } = await loadQueriesModule();
    const user = await createUser({
      discord_id: 'discord-1',
      discord_username: 'tester',
      discord_avatar: 'avatar-123',
    });

    expect(user?.discord_id).toBe('discord-1');
    expect(fallbackClient.insert).toHaveBeenCalledTimes(2);
    expect(fallbackClient.insert.mock.calls[0][0]).toMatchObject({ discord_username: 'tester' });
    expect(fallbackClient.insert.mock.calls[1][0]).not.toHaveProperty('discord_username');
    warnSpy.mockRestore();
  });

  it('retries updateUser without discord_avatar when Supabase users schema is behind', async () => {
    updateMock.mockRejectedValueOnce(new Error('permission denied for table users'));
    const fallbackClient = createUpdateFallbackClient([
      {
        data: null,
        error: { message: "Could not find the 'discord_avatar' column of 'users' in the schema cache" },
      },
      {
        data: {
          id: 'user-1',
          discord_id: 'discord-1',
          discord_username: 'tester',
          roles: ['user'],
          created_at: '2026-04-16T00:00:00.000Z',
          updated_at: '2026-04-16T00:00:00.000Z',
          last_login_at: '2026-04-16T00:00:00.000Z',
        },
        error: null,
      },
    ]);
    createSupabaseClientMock.mockReturnValueOnce(fallbackClient.client);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { updateUser } = await loadQueriesModule();
    const user = await updateUser('user-1', {
      discord_avatar: 'avatar-123',
      discord_username: 'tester',
    });

    expect(user?.id).toBe('user-1');
    expect(fallbackClient.update).toHaveBeenCalledTimes(2);
    expect(fallbackClient.update.mock.calls[0][0]).toMatchObject({ discord_avatar: 'avatar-123' });
    expect(fallbackClient.update.mock.calls[1][0]).not.toHaveProperty('discord_avatar');
    warnSpy.mockRestore();
  });

  it('retries updateUser without discord_username when Supabase users schema is behind', async () => {
    updateMock.mockRejectedValueOnce(new Error('permission denied for table users'));
    const fallbackClient = createUpdateFallbackClient([
      {
        data: null,
        error: { message: "Could not find the 'discord_username' column of 'users' in the schema cache" },
      },
      {
        data: {
          id: 'user-1',
          discord_id: 'discord-1',
          roles: ['user'],
          created_at: '2026-04-16T00:00:00.000Z',
          updated_at: '2026-04-16T00:00:00.000Z',
          last_login_at: '2026-04-16T00:00:00.000Z',
        },
        error: null,
      },
    ]);
    createSupabaseClientMock.mockReturnValueOnce(fallbackClient.client);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { updateUser } = await loadQueriesModule();
    const user = await updateUser('user-1', {
      discord_avatar: 'avatar-123',
      discord_username: 'tester',
    });

    expect(user?.id).toBe('user-1');
    expect(fallbackClient.update).toHaveBeenCalledTimes(2);
    expect(fallbackClient.update.mock.calls[0][0]).toMatchObject({ discord_username: 'tester' });
    expect(fallbackClient.update.mock.calls[1][0]).not.toHaveProperty('discord_username');
    warnSpy.mockRestore();
  });
});
