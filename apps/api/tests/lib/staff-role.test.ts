// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-09

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearStaffRoleCache, isTiltCheckStaff } from '../../src/lib/staff-role.js';

const STAFF_ROLE = '1488256012807966751';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('isTiltCheckStaff', () => {
  const savedToken = process.env.DISCORD_BOT_TOKEN;

  beforeEach(() => {
    clearStaffRoleCache();
    process.env.DISCORD_BOT_TOKEN = 'test-bot-token';
  });

  afterEach(() => {
    if (savedToken === undefined) delete process.env.DISCORD_BOT_TOKEN;
    else process.env.DISCORD_BOT_TOKEN = savedToken;
  });

  it('is false with no discord id', async () => {
    const f = vi.fn();
    expect(await isTiltCheckStaff(null, f as unknown as typeof fetch)).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it('is false (fail closed) when no bot token is configured', async () => {
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.TILT_DISCORD_BOT_TOKEN;
    const f = vi.fn();
    expect(await isTiltCheckStaff('123456789012345678', f as unknown as typeof fetch)).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it('is true when the member holds the TiltCheck Team role, and caches it', async () => {
    const f = vi.fn().mockResolvedValue(jsonResponse(200, { roles: ['1', STAFF_ROLE] }));
    expect(await isTiltCheckStaff('123456789012345678', f as unknown as typeof fetch)).toBe(true);
    expect(await isTiltCheckStaff('123456789012345678', f as unknown as typeof fetch)).toBe(true);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('is false without the role, when not a member, and on errors', async () => {
    const noRole = vi.fn().mockResolvedValue(jsonResponse(200, { roles: ['1'] }));
    expect(await isTiltCheckStaff('111111111111111111', noRole as unknown as typeof fetch)).toBe(false);

    const notMember = vi.fn().mockResolvedValue(jsonResponse(404, { message: 'Unknown Member' }));
    expect(await isTiltCheckStaff('222222222222222222', notMember as unknown as typeof fetch)).toBe(false);

    const limited = vi.fn().mockResolvedValue(jsonResponse(429, { retry_after: 1 }));
    expect(await isTiltCheckStaff('333333333333333333', limited as unknown as typeof fetch)).toBe(false);

    const boom = vi.fn().mockRejectedValue(new Error('network down'));
    expect(await isTiltCheckStaff('444444444444444444', boom as unknown as typeof fetch)).toBe(false);
  });
});
