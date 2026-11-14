// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-13
// /api/social through the real worker handler and the real SCORES Durable Object class (TriviaScores),
// with an in-memory DO namespace and a fake Discord /users/@me. Checks sign-in, which server a call
// lands on, the mod list (user ids, and roles through the bot), the write rate limit, and that no
// author id ever comes back over the wire.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleRequest, socialGuild, type Env } from '../worker/src/index.js';
import { TriviaScores } from '../worker/src/scores-do.js';
import { clearUserCache } from '../worker/src/auth.js';
import { clearModCache, isMod } from '../worker/src/mods.js';
import type { SocialView } from '../src/shared/social.js';

const GUILD = '123456789012345678';
const OTHER = '223456789012345678';
const INSTANCE = `i-1111-gc-${GUILD}-333333333333333333`;
const DM_INSTANCE = 'i-1111-pc-333333333333333333';

const USERS: Record<string, { id: string; username: string }> = {
  'tok-ana': { id: '100000000000000001', username: 'ana' },
  'tok-bo': { id: '100000000000000002', username: 'bo' },
  'tok-mod': { id: '100000000000000009', username: 'moddy' },
  'tok-spam': { id: '100000000000000077', username: 'spammy' },
  'tok-role': { id: '100000000000000055', username: 'roley' },
};

function fakeNamespace(env: Partial<Env>) {
  const objects = new Map<string, TriviaScores>();
  return {
    idFromName: (n: string) => n,
    get(id: string) {
      let o = objects.get(id);
      if (!o) {
        const data = new Map<string, unknown>();
        const ctx = {
          storage: {
            get: async (k: string) => structuredClone(data.get(k)),
            put: async (k: string, v: unknown) => void data.set(k, structuredClone(v)),
            delete: async (k: string) => data.delete(k),
          },
        };
        o = new TriviaScores(ctx as unknown as DurableObjectState, env);
        objects.set(id, o);
      }
      const obj = o;
      return { fetch: (u: string, init?: RequestInit) => obj.fetch(new Request(u, init)) };
    },
    objects,
  };
}

let env: Env;

beforeEach(() => {
  clearUserCache();
  clearModCache();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const auth = String((init?.headers as Record<string, string> | undefined)?.Authorization ?? '');
      if (url.endsWith('/users/@me')) {
        const u = USERS[auth.replace('Bearer ', '')];
        return u ? new Response(JSON.stringify({ ...u, global_name: null, avatar: null })) : new Response('{}', { status: 401 });
      }
      if (url.includes('/guilds/') && auth === 'Bot bot-secret-for-tests') {
        return new Response(JSON.stringify({ roles: url.endsWith('/100000000000000055') ? ['900000000000000001'] : [] }));
      }
      return new Response('{}', { status: 404 });
    }),
  );
  const partial: Partial<Env> = { HOT_TAKES_ROTATE_HOURS: '8', STORY_MAX_LINES: '20', SOCIAL_MOD_USER_IDS: '100000000000000009' };
  env = { ...partial, ROOMS: {} as DurableObjectNamespace, SCORES: fakeNamespace(partial) as unknown as DurableObjectNamespace } as Env;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function call(token: string | null, method: 'GET' | 'POST', body?: unknown, query = `guild=${GUILD}&instance=${INSTANCE}`) {
  const res = await handleRequest(
    new Request(`https://x.test/api/social?${query}`, {
      method,
      headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {},
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );
  const text = await res.text();
  return { status: res.status, text, json: JSON.parse(text) as SocialView & { error?: string } };
}

describe('/api/social: access', () => {
  it('needs a Discord sign-in', async () => {
    expect((await call(null, 'GET')).status).toBe(401);
    expect((await call('tok-nobody', 'GET')).status).toBe(401);
  });

  it('serves the view for a server; DMs have no server', async () => {
    const r = await call('tok-ana', 'GET');
    expect(r.status).toBe(200);
    expect(r.json.ok).toBe(true);
    expect(r.json.mod).toBe(false);
    expect(r.json.hot.featured).not.toBeNull();
    expect(r.json.story.max).toBe(20);
    const dm = await call('tok-ana', 'GET', undefined, `instance=${DM_INSTANCE}`);
    expect(dm.status).toBe(404);
    expect(dm.json.error).toBe('no-server');
  });

  it("the instance id's guild wins; a client guild that disagrees is refused", async () => {
    expect(socialGuild(INSTANCE, GUILD)).toEqual({ ok: true, guild: GUILD });
    expect(socialGuild(INSTANCE, null)).toEqual({ ok: true, guild: GUILD });
    expect(socialGuild(INSTANCE, OTHER)).toEqual({ ok: false });
    expect(socialGuild(DM_INSTANCE, GUILD)).toEqual({ ok: true, guild: null });
    expect(socialGuild('bad id!', GUILD)).toEqual({ ok: false });
    expect((await call('tok-ana', 'GET', undefined, `guild=${OTHER}&instance=${INSTANCE}`)).status).toBe(400);
  });

  it('each server has its own story and takes', async () => {
    const a = await call('tok-ana', 'GET');
    const b = await call('tok-ana', 'GET', undefined, `guild=${OTHER}&instance=i-2-gc-${OTHER}-4444444444`);
    expect(a.json.story.id).not.toBe(b.json.story.id);
  });

  it('rejects bad bodies', async () => {
    expect((await call('tok-ana', 'POST', { op: 'drop.tables' })).status).toBe(400);
    const res = await handleRequest(
      new Request(`https://x.test/api/social?guild=${GUILD}&instance=${INSTANCE}`, { method: 'POST', headers: { Authorization: 'Bearer tok-ana' }, body: 'not json' }),
      env,
    );
    expect(res.status).toBe(400);
    expect((await handleRequest(new Request(`https://x.test/api/social?guild=${GUILD}`, { method: 'PUT', headers: { Authorization: 'Bearer tok-ana' } }), env)).status).toBe(405);
  });
});

describe('/api/social: anonymity over the wire', () => {
  it('a submitted take never carries its author in any response', async () => {
    const sub = await call('tok-ana', 'POST', { op: 'hot.submit', text: 'Ana thinks cereal is soup' });
    expect(sub.status).toBe(200);
    const texts = [sub.text, (await call('tok-bo', 'GET')).text, (await call('tok-mod', 'GET')).text];
    const modView = JSON.parse(texts[2] as string) as SocialView;
    expect(modView.mod).toBe(true);
    expect(modView.hot.modQueue!.map((t) => t.text)).toContain('Ana thinks cereal is soup');
    for (const t of texts) {
      expect(t).not.toContain(USERS['tok-ana']!.id);
      expect(t).not.toMatch(/"by"|"author"/);
    }
  });

  it('refusals come back as 409 with the fresh view', async () => {
    const v = await call('tok-ana', 'GET');
    const id = v.json.hot.featured!.id;
    expect((await call('tok-ana', 'POST', { op: 'hot.vote', pollId: id, vote: 'agree' })).status).toBe(200);
    const again = await call('tok-ana', 'POST', { op: 'hot.vote', pollId: id, vote: 'disagree' });
    expect(again.status).toBe(409);
    expect(again.json.error).toBe('already-voted');
    expect(again.json.hot.featured!.results!.agree).toBe(1);
  });
});

describe('/api/social: mods', () => {
  it('only listed mods can hide; players get not-mod', async () => {
    const v = await call('tok-ana', 'GET');
    const id = v.json.hot.featured!.id;
    const no = await call('tok-bo', 'POST', { op: 'mod.hide', kind: 'take', id, hidden: true });
    expect(no.status).toBe(409);
    expect(no.json.error).toBe('not-mod');
    const yes = await call('tok-mod', 'POST', { op: 'mod.hide', kind: 'take', id, hidden: true });
    expect(yes.status).toBe(200);
    expect(yes.json.hot.featured!.id).not.toBe(id);
  });

  it('role ids count only with the bot token, and through the member lookup', async () => {
    const roleEnv = { SOCIAL_MOD_ROLE_IDS: '900000000000000001' };
    expect(await isMod('100000000000000055', GUILD, roleEnv)).toBe(false);
    const withBot = { ...roleEnv, DISCORD_BOT_TOKEN: 'bot-secret-for-tests' };
    expect(await isMod('100000000000000055', GUILD, withBot)).toBe(true);
    expect(await isMod('100000000000000001', GUILD, withBot)).toBe(false);
    expect(await isMod('100000000000000009', GUILD, { SOCIAL_MOD_USER_IDS: ' 100000000000000009 , junk' })).toBe(true);
    expect(await isMod('100000000000000009', GUILD, {})).toBe(false);
  });
});

describe('/api/social: write rate limit', () => {
  it('a burst of writes from one player gets 429', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 8; i += 1) statuses.push((await call('tok-spam', 'POST', { op: 'hot.submit', text: `spam ${i}` })).status);
    expect(statuses).toContain(429);
    // The 3-a-day limit kicked in before that (409 daily-limit), and only 3 got through.
    expect(statuses.filter((s) => s === 200)).toHaveLength(3);
  });
});
